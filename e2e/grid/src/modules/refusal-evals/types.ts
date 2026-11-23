// The error row's evals (Goal 3, "What the guardrail checks"). One refusal, judged in every output the goal names: the CLI
// prints `[code] Name { … }` and exits with its code, the MCP result carries its code with fields cut to what the agent may
// see, the docs list it in each declaring operation's refusals table, the portal shows it under that operation's arrow
// counted by code, and the span carries `refusal.code`. Each judges a refusal named in the list (`HandleTaken`, `NotAllowed`),
// never a literal, so they apply to any refusal. They are pure: the evidence is gathered elsewhere.
import type { Eval } from "../grid/types.ts";

export interface FieldView { readonly visibility?: unknown }
/** What the compiled model (`generated/model/model.json`) says that the evals read, and nothing more. */
export interface ModelView {
  readonly refusals: Readonly<Record<string, string>>;
  readonly things: Readonly<Record<string, {
    readonly errors?: Readonly<Record<string, { readonly fields: Readonly<Record<string, FieldView>>; readonly exit: number; readonly code: string }>>;
    readonly machine?: null | { readonly notFrom: { readonly error: string; readonly exit: number; readonly code: string } };
    /** The refusal for an id that names no such thing (`PersonNotFound`, `PE-901`), when the thing can be missed. */
    readonly notFound?: { readonly error: string; readonly exit: number; readonly code: string };
  }>>;
  readonly operations: Readonly<Record<string, { readonly name: string; readonly thing: string; readonly verb: string; readonly refusals?: ReadonlyArray<string>; readonly errors?: ReadonlyArray<string> }>>;
}

/** A refused call seen through the generated CLI: its exit status and what it printed. */
export interface CliOutcome { readonly status: number | null; readonly stdout: string; readonly stderr: string }
/** A refused call seen through the generated MCP server: a tool result, as the server's own or the protocol's shape. */
export interface McpOutcome {
  readonly isError?: boolean;
  readonly text?: string;
  readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
}
export interface SpanView { readonly name: string; readonly attrs: Readonly<Record<string, unknown>> }

/** Everything the five evals judge from, for one refusal. `undefined` is "could not be observed", which is red. */
export interface RefusalEvidence {
  readonly model: ModelView;
  /** Each operation's generated docs page, by operation name. */
  readonly docs: Readonly<Record<string, string | undefined>>;
  /** Each operation's portal page (server-rendered HTML), by operation name. */
  readonly portal: Readonly<Record<string, string | undefined>>;
  /** The spans of the journey run that refused it. */
  readonly spans: ReadonlyArray<SpanView> | undefined;
  /** The roles the observed caller held (`allowance.grantee`), by name: a private field is shown to a caller who holds one it names. */
  readonly held: ReadonlyArray<string>;
  readonly cli: CliOutcome | undefined;
  readonly mcp: McpOutcome | undefined;
}

export interface RefusalEvalsApi {
  /** `error.cli`, `error.mcp`, `error.docs`, `error.portal` and `error.telemetry`. */
  readonly evals: ReadonlyArray<Eval<RefusalEvidence>>;
  /** The operations that declare a refusal (its docs and portal pages are judged), from the model. */
  readonly declaredBy: (model: ModelView, refusal: string) => ReadonlyArray<string>;
}
