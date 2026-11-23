// The machine row's nine evals (K14, "Machine"). One thing's lifecycle, named in the list by the thing (`link`), judged in every output: the
// model's states and moves, the API's wrong-state refusal and the type of `state`, the server's machine checks, the SDK's state union, the
// CLI's and MCP's text about the states a move crosses, the docs' machine section, the portal's lifecycle strip and the span's `move.*`.
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface MachineEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
