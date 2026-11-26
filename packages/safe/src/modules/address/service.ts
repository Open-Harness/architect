import { Effect } from "effect";
import type { SafeAddressApi } from "./types.ts";

/** Empty handlers until the build lands (`address.test.ts`). */
export const SafeAddress: SafeAddressApi = {
  initializer: () => Effect.die("SafeAddress.initializer is not built"),
  salt: () => "0x",
  predict: () => Effect.die("SafeAddress.predict is not built"),
};
