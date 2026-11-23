import { docs, model, portal, server, telemetry } from "./internal/surfaces.ts";
import type { EventEvalsApi } from "./types.ts";

export const EventEvals: EventEvalsApi = { evals: [model, server, docs, portal, telemetry] };
