import { portal } from "./internal/portal.ts";
import { api, model, server, sdk } from "./internal/source.ts";
import { docs, mcp, telemetry } from "./internal/surfaces.ts";
import type { InvariantEvalsApi } from "./types.ts";

// `invariant.cli` has no eval until the refused call can be seen through the CLI (held off in `held-off.json`, as `error.cli` is).
export const InvariantEvals: InvariantEvalsApi = { evals: [model, api, server, sdk, mcp, docs, portal, telemetry] };
