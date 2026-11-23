import { Effect } from "effect";
import { Chain } from "../chain/service.ts";
import { Keyfile } from "../keyfile/service.ts";
import { Keystore } from "../keystore/service.ts";
import { Signers } from "../signer/service.ts";
import type { NodeHostApi } from "./types.ts";
import { directoryOf, nodeSettings } from "./internal/settings.ts";

export const NodeHost: NodeHostApi = {
  signer: (name) =>
    Effect.gen(function* () {
      const chain = yield* Chain.fromHost;
      if (name !== "node") {
        return Signers.absent(name, chain, name === "browser" ? "a page's wallet is only there in a browser" : name === "keystore" ? "its keys live on a server, which this host does not reach yet" : "it exists only in a world");
      }
      const { home, user, passphrase } = yield* nodeSettings.pipe(Effect.orDie);
      return Signers.keyed(name, chain, Keyfile.keyring({ directory: directoryOf(home, user), passphrase, cost: Keystore.cost.standard }));
    }),
};
