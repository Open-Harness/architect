import { Effect } from "effect";
import type { SafeWorldApi } from "./types.ts";

/** Empty handler until the build lands (`world.test.ts`). */
export const SafeWorld: SafeWorldApi = {
  install: () => Effect.die("SafeWorld.install is not built"),
};
