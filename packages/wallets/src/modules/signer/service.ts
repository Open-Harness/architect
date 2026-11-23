import type { SignersApi } from "./types.ts";
import { absent } from "./internal/absent.ts";
import { keyed } from "./internal/keyed.ts";
import { labelsInMemory, memory } from "./internal/memory.ts";
import { provided } from "./internal/provided.ts";

export const Signers: SignersApi = { keyed, provided, absent, memory, labelsInMemory };
