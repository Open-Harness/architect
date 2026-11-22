// ST2.02 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { ConformanceApi } from "./types.ts";

export const Conformance: ConformanceApi = {
  run: () => Effect.die("ST2.02: not built"),
};
