import { docs, portal } from "./internal/builders.ts";
import { cli, mcp } from "./internal/clients.ts";
import { api, model, sdk, server, telemetry } from "./internal/source.ts";
import type { ThingEvalsApi } from "./types.ts";

export const ThingEvals: ThingEvalsApi = { evals: [model, api, server, sdk, cli, mcp, docs, portal, telemetry] };
