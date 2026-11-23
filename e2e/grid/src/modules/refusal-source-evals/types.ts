// The error row's four cells that judge from the project's own evidence rather than one refusal's: `error.model`, `error.api`, `error.server`
// and `error.sdk` (the clients, docs, portal and span are `refusal-evals`). One refusal, named in the list (`HandleTaken`, `NotAllowed`).
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface RefusalSourceEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
