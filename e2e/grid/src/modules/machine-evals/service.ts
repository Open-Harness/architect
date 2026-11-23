import { cli, mcp } from "./internal/clients.ts";
import { api, docs, model, portal, sdk, server, telemetry } from "./internal/source.ts";
import type { MachineEvalsApi } from "./types.ts";

export const MachineEvals: MachineEvalsApi = { evals: [model, api, server, sdk, cli, mcp, docs, portal, telemetry] };
