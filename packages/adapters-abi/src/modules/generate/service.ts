// ST2.02 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { AbiAdaptersApi } from "./types.ts";

export const AbiAdapters: AbiAdaptersApi = {
  parse: () => Effect.die("ST2.02: not built"),
  plan: () => Effect.die("ST2.02: not built"),
};
