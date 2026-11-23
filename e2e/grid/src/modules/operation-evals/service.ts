import { docs, portal } from "./internal/builders.ts";
import { cli, mcp } from "./internal/clients.ts";
import { server, telemetry } from "./internal/runtime.ts";
import { api, model, sdk } from "./internal/source.ts";
import type { OperationEvalsApi } from "./types.ts";

export const OperationEvals: OperationEvalsApi = { evals: [model, api, server, sdk, cli, mcp, docs, portal, telemetry] };
