// The event row's five live evals (K14, "Event"): model, server, docs, portal and telemetry. One event, named in the list (`LinkAdded`).
// The API, SDK, CLI and MCP cells have no evals: event's audience leaves out the caller (K14 Q3, not yet Aaron's answer), so they stay off.
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface EventEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
