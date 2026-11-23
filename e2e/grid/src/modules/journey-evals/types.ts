// The journey row's five live evals (K14, "Journey"): model, server, docs, portal and telemetry. One journey, named in the list. The API, SDK,
// CLI and MCP cells have no evals: journeys run through those clients, never in them (K14 Q2, not yet Aaron's answer), so they stay off.
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface JourneyEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
