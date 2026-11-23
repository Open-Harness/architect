// Where the error row's evidence comes from. Every source is a port handed in, so the module reads nothing itself and is
// tested with plain functions; `src/main.ts` wires the real ones (the project's generated files, the portal's own handler, the
// spans prove's last run wrote to `.ortho/prove-telemetry`, the refused calls a client journey recorded).
import type { Effect } from "effect";
import type { CliOutcome, McpOutcome, ModelView, RefusalEvidence, SpanView } from "../refusal-evals/types.ts";

/** A refused call, seen through each client: written by whatever ran the journey through it (`prove --through`, M2.08). */
export interface Observed { readonly held?: ReadonlyArray<string>; readonly cli?: CliOutcome; readonly mcp?: McpOutcome }

export interface Ports {
  /** A text file of the project, by path from its root (`generated/docs/handle/claim.md`); `undefined` when it is not there. */
  readonly read: (path: string) => Effect.Effect<string | undefined>;
  /** A page of the portal over the project's own blueprint, by route; `undefined` when it cannot be rendered. */
  readonly portal: (route: string) => Effect.Effect<string | undefined>;
  /** Every span the last prove run wrote; `undefined` when there is no such run. */
  readonly spans: () => Effect.Effect<ReadonlyArray<SpanView> | undefined>;
  /** The refused calls the climb's client journeys recorded, by refusal name. */
  readonly observed: (refusal: string) => Effect.Effect<Observed | undefined>;
}

export interface EvidenceApi {
  /** Everything the error row's evals judge `refusal` from: its operations' docs and portal pages, the spans, the clients' outcomes. */
  readonly ofRefusal: (options: { readonly model: ModelView; readonly refusal: string; readonly ports: Ports }) => Effect.Effect<RefusalEvidence>;
}
