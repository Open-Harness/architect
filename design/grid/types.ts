// The grid's data model: the contract `design/grid/grid.json` keeps and the mission board reads.
//
// The meaning of each building block in each output (K14, `design/decisions/K14-the-grid.md`). Owned by the grid
// thread, changed by pull request, static between merges; the record and `grid.json` change together.
//
// Two owners, joined by a cell id (`<block>.<output>`, e.g. "visibility.api"):
//   Grid  — this file: what each cell means and how it stood when last graded from the code (`asOf`).
//   Board — the conductor's live layer (who is on a cell, how it moved), in the board's own types
//           (`spikes/mission-board/src/data/types.ts` on the board's branch). It moves a cell's state after `asOf`.
// Nothing derivable is stored here: lane scores, a card's role, "what changed since" and the hill climb come from cells,
// blocks, outputs and history.
//
// Shape agreed with the mission board thread on 19 November 2026, from its proposal; the additions to it are marked
// "added by K14" below. Any change to this file is sent to the board thread and the conductor.
//
// Changed 19 November 2026 (K14, "Who each block is for"): audiences on blocks and outputs; a cell's role
// (carries, absence check, not needed) is derived by `cellRole`, never stored. `notNeededProposal` and
// `notNeededBecause` are gone: the reason a card is not needed is its block's `audiencesBecause`.

/** The fifteen building blocks (the thirteen of the audit, then invariants, G5, and time, K23), one swim lane each. Stable: the board links threads and history to them. */
export type BlockId =
  | "thing" | "operation" | "step" | "machine" | "event" | "error" | "roles"
  | "visibility" | "environment" | "store" | "mount" | "device" | "journey" | "invariant" | "time";

/** Who an output is written for. caller: api, sdk, cli, mcp. builder: model, docs (and the scaffold). operator: server,
 * telemetry. The portal serves the builder and the operator. Added by K14. */
export type Audience = "caller" | "builder" | "operator";

/** The nine outputs, one card slot in every lane. Stable. */
export type OutputId = "model" | "api" | "server" | "sdk" | "cli" | "mcp" | "docs" | "portal" | "telemetry";

/** A card's id: its block and output, e.g. "event.sdk". Stable. */
export type CellId = `${BlockId}.${OutputId}`;

/**
 * green: its evidence ran and passed. built: the code carries it (today ✓) but no verdict has been recorded yet
 * (added by K14: K14 says a card is green only on evidence). partly: some of green-means holds. red: none of it.
 * not-needed: its role is "not-needed" (from `cellRole`) and Aaron has agreed the rule (Q2's answer is "A"). Until
 * then a cell keeps its graded state, and the board may show the derived role beside it.
 */
export type CellState = "green" | "built" | "partly" | "red" | "not-needed";

/** The grade read from the code at `asOf`: carried, partly, dropped. Added by K14. */
export type Today = "✓" | "~" | "✗";

export interface Grid {
  readonly asOf: string;                   // the commit the grades were read from, e.g. "m1@6419d4b7"
  readonly record: string;                 // the decision record this file mirrors (added by K14)
  readonly goal: Goal;
  readonly blocks: ReadonlyArray<Block>;   // swim lanes; `order` is the hill-climb order
  readonly outputs: ReadonlyArray<Output>; // card slots in every lane, in `order`
  readonly cells: ReadonlyArray<Cell>;     // blocks × outputs, all 135; a missing cell is a schema error
  readonly story: Story;                   // added by K14
  readonly questions: ReadonlyArray<Question>; // added by K14
}

export interface Goal {
  readonly title: string;
  readonly summary: string;                // two sentences (added by K14)
  readonly writeUp: ReadonlyArray<string>; // paragraphs, plain words
  readonly doneWhen: string;               // the single check that ends the goal
}

export interface Block {
  readonly id: BlockId;
  readonly name: string;      // "Field visibility (secret, private)"
  readonly summary: string;   // one line: what the block is in a blueprint
  readonly order: number;     // 1-based, the hill-climb order
  readonly endState: EndState;
  readonly proof: string;     // how the whole lane is proved: the portal view, the journeys, the checks (added by K14)
  readonly audiences: ReadonlyArray<Audience>;  // who the block is for (added by K14)
  readonly absentFrom: ReadonlyArray<Audience>; // audiences it must never reach: its cards there are absence checks (added by K14)
  readonly audiencesBecause: string;            // why; also the reason shown on a not-needed card (added by K14)
}

/** What proves the whole lane: a portal view, or (for the clients' columns) journeys through the SDK, CLI and MCP. */
export interface EndState {
  readonly kind: "portal-view" | "journey";
  readonly title: string;       // "The operation's page and the operations matrix"
  readonly description: string; // the lane's end state, in full
  readonly ref: string | null;  // the view's route or the journey's path, once it exists
}

export interface Output {
  readonly id: OutputId;
  readonly name: string;                             // "MCP"
  readonly provedBy: "check" | "portal" | "journey"; // how a card in this column gets its evidence
  readonly order: number;
  readonly tier: "source" | "surface" | "evidence";  // K14, "How the columns relate" (added by K14)
  readonly dependsOn: ReadonlyArray<OutputId>;       // a card here is green only after these are, in its lane (added by K14)
  readonly audiences: ReadonlyArray<Audience>;       // who it is written for; only the portal has two (added by K14)
}

/** What a card is for, derived from its block's and its output's audiences (K14, "Who each block is for"). Added by K14. */
export type CellRole = "carries" | "absence" | "not-needed";

/** A card carries its block when their audiences meet; is an absence check when the block must never reach the output's
 * audience; and is otherwise not needed. The board calls this; nothing stores a role. */
export const cellRole = (block: Block, output: Output): CellRole =>
  output.audiences.some((a) => block.audiences.includes(a)) ? "carries"
  : output.audiences.some((a) => block.absentFrom.includes(a)) ? "absence"
  : "not-needed";

export interface Cell {
  readonly id: CellId;
  readonly block: BlockId;
  readonly output: OutputId;
  readonly state: CellState;                 // as of `asOf`; the board's history moves it after that
  readonly today: Today;                     // added by K14
  readonly todayRef: string | null;          // path:line on `asOf` where today's behaviour lives, or is dropped
  readonly todayNote: string;                // what the grade means, concretely (added by K14)
  readonly greenMeans: string | null;        // one or two sentences; null = not written yet (shown as a gap)
  readonly evidence: ReadonlyArray<Evidence>;
  readonly owner: string;                    // the slice that turns it green, or "new slice needed: …" (added by K14)
  readonly question: QuestionId | null;      // the question for Aaron that decides this cell, if any (added by K14)
}

export interface Evidence {
  readonly kind: "eval" | "check" | "journey" | "file" | "pr";
  readonly label: string;
  readonly ref: string;             // path, path:line, slice id (e.g. "M1.41"), eval id or PR number
  readonly passing: boolean | null; // null = not run yet, or not run by whoever wrote this file
}

/** The end-to-end run that proves the grid whole (K14, "The end-to-end story"). Added by K14. */
export interface Story {
  readonly summary: string;
  readonly steps: ReadonlyArray<StoryStep>;
  readonly missing: string;
  readonly proposedSlice: string;
}

export interface StoryStep {
  readonly n: number;
  readonly step: string;
  readonly proves: string;
  readonly lanes: string;
  readonly describedBy: string; // the slices and gates that already describe it
  readonly gap: string;
}

export type QuestionId = "Q1" | "Q2" | "Q3" | "Q4";

/** A call that is Aaron's, in K14's grill. Added by K14. */
export interface Question {
  readonly id: QuestionId;
  readonly question: string;
  readonly recommendation: string;
  readonly cells: ReadonlyArray<CellId>;
  readonly answer: string | null; // Aaron's answer once given, e.g. "A"
}
