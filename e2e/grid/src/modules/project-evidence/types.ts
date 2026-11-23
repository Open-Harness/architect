// The evidence every row eval judges from, gathered once for the whole project through injected ports: the compiled model, every
// generated file, the portal's own pages, the generated CLI's real `--help`, the MCP server's real `tools/list`, the spans a
// prove run wrote and prove's own report. An output that could not be observed is `undefined`, and its evals are red with that said.
import type { Effect } from "effect";
import type { OutputId } from "../grid/types.ts";
import type { SpanView } from "../refusal-evals/types.ts";

export interface FieldModel {
  readonly value: { readonly type: string; readonly [key: string]: unknown };
  readonly ref?: string;
  readonly named?: string;
  readonly optional?: boolean;
  readonly visibility?: unknown;
  readonly description?: string;
  readonly traced?: boolean;
}
export type Fields = Readonly<Record<string, FieldModel>>;
export interface MoveModel { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }
export interface StepModel { readonly name: string; readonly type: string; readonly writes?: unknown; readonly optional?: boolean; readonly call?: unknown }
export interface OperationModel {
  readonly kind: string;
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  /** The verb as code names it (`signUp` for `sign-up`). */
  readonly identifier?: string;
  readonly description?: string;
  readonly payload: Fields;
  readonly answer: Fields;
  readonly move: MoveModel | null;
  /** Every refusal a call can get: the declared ones and the runtime's own (`NotAllowed`). */
  readonly refusals?: ReadonlyArray<string>;
  /** The errors the operation's handler is left to refuse (`errors:`); a rule's refusal is not among them (G5 section 3). */
  readonly errors?: ReadonlyArray<string>;
  /** From each refusal a rule owns, the rule that gives it: `{ HandleTaken: "handle.oneHolderPerName" }` (G5 section 3). */
  readonly invariants?: Readonly<Record<string, string>>;
  /** Every rule the operation can break, `<thing>.<rule>`, whether or not the rule owns a refusal (S31). Absent in a model captured before S31: then `invariants` is what it can break. */
  readonly breaks?: ReadonlyArray<string>;
  readonly allowed: ReadonlyArray<{ readonly kind: string; readonly role?: string }>;
  readonly steps?: Readonly<Record<string, StepModel>>;
  readonly idempotent?: unknown;
  readonly budget?: { readonly p95Ms: number };
  readonly runs?: string;
}
export interface MachineModel {
  readonly states: ReadonlyArray<string>;
  readonly moves: Readonly<Record<string, { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }>>;
  readonly notFrom: { readonly error: string; readonly exit: number; readonly code: string };
}
/** A rule of a thing (`Blueprint.invariant.unique`), as the model carries it under `things.<thing>.invariants.<rule>`. */
export interface RuleModel {
  readonly kind: string;
  readonly fields: ReadonlyArray<string>;
  readonly while?: ReadonlyArray<string>;
  readonly refuse?: string;
  readonly description?: string;
}
export interface ThingModel {
  readonly name: string;
  readonly identifier: string;
  readonly description?: string;
  readonly fields: Fields;
  readonly machine?: MachineModel | null;
  readonly events?: Readonly<Record<string, Fields>>;
  readonly errors?: Readonly<Record<string, { readonly fields: Fields; readonly exit: number; readonly code: string }>>;
  readonly notFound?: { readonly error: string; readonly exit: number; readonly code: string };
  /** The thing's rules by their own name (`oneHolderPerName`); a rule's full name is `<thing>.<rule>`. */
  readonly invariants?: Readonly<Record<string, RuleModel>>;
  /** G4's one-line `unique` view; ST1.20 retires it. */
  readonly unique?: Readonly<Record<string, unknown>>;
}
export interface JourneyModel {
  readonly name: string;
  readonly starts?: string | null;
  readonly cast?: Readonly<Record<string, { readonly kind: string; readonly role?: string }>>;
  readonly steps: ReadonlyArray<{ readonly title: string; readonly skipped?: string; readonly call?: { readonly actor: string; readonly operation: string; readonly payload?: Readonly<Record<string, unknown>>; readonly request?: string }; readonly checks?: ReadonlyArray<{ readonly kind: string; readonly error?: string; readonly fields?: unknown; readonly value?: unknown; readonly match?: string }> }>;
}
export interface ProjectModel {
  readonly refusals: Readonly<Record<string, string>>;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly operations: Readonly<Record<string, OperationModel>>;
  readonly journeys?: Readonly<Record<string, JourneyModel>>;
  readonly startingWorlds?: Readonly<Record<string, unknown>>;
}

/** One tool as the MCP server's `tools/list` answers it. */
export interface McpToolView {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: { readonly properties?: Readonly<Record<string, { readonly type?: string; readonly description?: string }>>; readonly required?: ReadonlyArray<string> };
  readonly outputSchema?: unknown;
  /** What the framework attaches to the tool beyond the MCP's own fields: a move's `{ key, from, to, emits }` is `_meta.move`. */
  readonly _meta?: unknown;
  readonly annotations?: { readonly readOnlyHint?: boolean };
}

/** What a prove run said: each journey with its steps, and the lines it printed (`handle.claim steps ✔`, `journey … ✔ 5/5 steps`). */
export interface ProveReport {
  readonly journeys: ReadonlyArray<{ readonly name: string; readonly verdict: string; readonly steps: ReadonlyArray<{ readonly name: string; readonly verdict: string; readonly operation: string }> }>;
  readonly lines: ReadonlyArray<string>;
}

export interface ProjectEvidence {
  readonly model: ProjectModel;
  /** Every text file under `generated/`, by its path from the project's root. */
  readonly files: Readonly<Record<string, string>>;
  /** The portal's pages by route: `/portal`, `/portal/operations/<op>`, `/portal/things/<thing>`. */
  readonly portal: Readonly<Record<string, string | undefined>>;
  /** The generated CLI's real `--help`, by the command words it was asked about (`""` is the root, `"link remove"` a verb). */
  readonly cli: Readonly<Record<string, string | undefined>>;
  readonly mcp: ReadonlyArray<McpToolView> | undefined;
  readonly spans: ReadonlyArray<SpanView> | undefined;
  readonly prove: ProveReport | undefined;
}

export interface ProjectPorts {
  readonly model: Effect.Effect<ProjectModel | undefined>;
  readonly generated: Effect.Effect<Readonly<Record<string, string>>>;
  readonly portal: (route: string) => Effect.Effect<string | undefined>;
  readonly cliHelp: (words: ReadonlyArray<string>) => Effect.Effect<string | undefined>;
  readonly mcpTools: Effect.Effect<ReadonlyArray<McpToolView> | undefined>;
  readonly spans: Effect.Effect<ReadonlyArray<SpanView> | undefined>;
  readonly prove: Effect.Effect<ProveReport | undefined>;
}

export interface ProjectEvidenceApi {
  /** Everything the row evals judge from. Only the outputs in `wanted` are observed (the CLI is a process per question, so it is asked for only when a cell needs it). */
  readonly gather: (options: { readonly ports: ProjectPorts; readonly wanted: ReadonlySet<OutputId> }) => Effect.Effect<ProjectEvidence | undefined>;
  /** The CLI commands a model asks `--help` of: the root, each thing, each operation's `<thing> <verb>`. */
  readonly cliCommands: (model: ProjectModel) => ReadonlyArray<string>;
  /** `generated/docs/<thing>/<verb>.md`, or `generated/docs/<thing>/index.md` for a thing's own page. */
  readonly docsPath: (thing: string, verb?: string) => string;
}
