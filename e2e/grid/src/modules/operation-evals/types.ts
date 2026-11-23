// The operation row's nine evals (K14, "Operation & read"). One operation, named in the list (`handle.claim`), judged in every output:
// the model, the API's endpoint, the server's checks and span, the SDK's function, the CLI's command, the MCP tool, the docs page,
// the portal page and the telemetry. Each reads the project's evidence and the operation's model entry, never a literal name.
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface OperationEvalsApi {
  /** `operation.model` to `operation.telemetry`. */
  readonly evals: ReadonlyArray<Eval<ProjectEvidence>>;
}
