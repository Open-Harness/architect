import { Effect } from "effect";
import type { SafeCallsApi, SafeClientApi } from "./types.ts";

/** Empty handlers until the build lands (`client.test.ts`). */
export const SafeCalls: SafeCallsApi = {
  execTransaction: () => Effect.die("SafeCalls.execTransaction is not built"),
  approveHash: () => Effect.die("SafeCalls.approveHash is not built"),
  swapOwner: () => Effect.die("SafeCalls.swapOwner is not built"),
  addOwnerWithThreshold: () => Effect.die("SafeCalls.addOwnerWithThreshold is not built"),
};

export const SafeClient: SafeClientApi = {
  owners: () => Effect.die("SafeClient.owners is not built"),
  threshold: () => Effect.die("SafeClient.threshold is not built"),
  nonce: () => Effect.die("SafeClient.nonce is not built"),
  send: () => Effect.die("SafeClient.send is not built"),
};
