// ST2.02 (empty handlers): every function is here and typed, and none is built.
import { Effect } from "effect";
import type { EventsApi } from "./types.ts";

export const AbiEvents: EventsApi = {
  source: () => ({
    address: "0x0000000000000000000000000000000000000000",
    event: { type: "event", name: "unbuilt", inputs: [] },
    fromBlock: 0n,
    decode: () => Effect.die("ST2.02: not built"),
  }),
};
