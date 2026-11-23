import { Effect } from "effect";
import { Signers } from "../signer/service.ts";
import type { ServerApi } from "./types.ts";
import { SERVER_LABEL, emptyStore } from "./internal/store.ts";

export const Server: ServerApi = {
  keystore: ({ secret, chain }) => {
    const signer = Signers.keyed("keystore", chain, Signers.memory(emptyStore()));
    // Put through the signer's own import, so the key is checked and never answered.
    return Effect.as(signer.import(SERVER_LABEL, secret), signer);
  },
};
