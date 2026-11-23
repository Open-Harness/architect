import type { ChainsApi } from "./types.ts";
import { network, token } from "./internal/binding.ts";

export const Chain: ChainsApi = { evm: Object.freeze({ network, token }) };
