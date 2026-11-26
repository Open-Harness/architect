import { Effect } from "effect";
import type { AbiAdapterApi } from "./types.ts";

// Not built yet (unit A1, #1164): the checks in this module are red until it is.
const generate: AbiAdapterApi["generate"] = () => Effect.die("AbiAdapter.generate is not built yet (#1164)");

export const AbiAdapter: AbiAdapterApi = { generate };
export { AbiRefused } from "./types.ts";
export type { AbiAdapterApi, ContractInput, ContractMade, GeneratedAbiAdapter, PluginFile } from "./types.ts";
