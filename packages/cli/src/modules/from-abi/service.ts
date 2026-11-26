import { Effect } from "effect";
import type { FromAbiApi } from "./types.ts";

// Not built yet (unit A1, #1164): the checks in this module are red until it is.
const adapter: FromAbiApi["adapter"] = () => Effect.die("FromAbi.adapter is not built yet (#1164)");

export const FromAbi: FromAbiApi = { adapter };
