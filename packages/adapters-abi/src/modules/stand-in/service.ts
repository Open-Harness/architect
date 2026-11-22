// ST2.02 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { StandInApi } from "./types.ts";

export const StandInContract: StandInApi = {
  deploy: () => Effect.die("ST2.02: not built"),
};
