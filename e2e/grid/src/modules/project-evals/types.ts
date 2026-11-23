// Every eval that judges from the project's evidence (`project-evidence`): the operation, thing, step, machine, event, journey and invariant rows,
// and the error row's model, api, server and sdk cells. The error row's client and docs cells judge one refusal's own evidence
// (`refusal-evals`).
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface ProjectEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
