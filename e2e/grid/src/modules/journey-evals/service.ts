import { docs, model, portal, server, telemetry } from "./internal/surfaces.ts";
import type { JourneyEvalsApi } from "./types.ts";

export const JourneyEvals: JourneyEvalsApi = { evals: [model, server, docs, portal, telemetry] };
