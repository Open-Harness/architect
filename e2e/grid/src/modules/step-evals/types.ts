// The step row's nine evals (K14, "Step"). One declared step, named in the list by its full name (`handle.claim.load`), judged in every
// output: the model, the server's run and span, the docs' steps list, the portal's spine and the span, and, as absence checks, the four
// outputs a caller sees (API, SDK, CLI, MCP), which must never name it (K14 Q1: the recommended reading, not yet Aaron's answer).
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface StepEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
