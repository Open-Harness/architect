// The invariant row's evals (K14, lane 14; G5). One rule of a thing, named in the list as `<thing>.<rule>` (`handle.oneHolderPerName`), judged in the
// outputs the lane's cards name: the model's rule and the operations that can break it, the API's refusal in each breaker's errors, the server's index and
// the runtime's own refusal, the SDK's error channel, the MCP tool's sentence, the docs' Invariants section and refusals table, the portal's Rules
// section and spine stop, and the span's `refusal.invariant`. `invariant.cli` has an eval's place in the grid but is held off, like `error.cli`: it needs
// the refused call seen through the CLI as data (`prove --through`, M2.08).
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface InvariantEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
