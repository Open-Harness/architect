import { api, cli, docs, mcp, model, portal, sdk, server, telemetry } from "./internal/surfaces.ts";
import type { StepEvalsApi } from "./types.ts";

export const StepEvals: StepEvalsApi = { evals: [model, api, server, sdk, cli, mcp, docs, portal, telemetry] };
