import { Effect } from "effect";
import type { ZodiacWorldApi } from "./types.ts";

// Empty handler until the build (#1163): the check is world.test.ts.
export const ZodiacWorld: ZodiacWorldApi = {
  install: () => Effect.die("ZodiacWorld.install is not built (#1163)"),
};
