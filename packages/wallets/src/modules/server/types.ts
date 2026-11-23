import type { Effect, Redacted } from "effect";
import type { KeyLocked } from "../../../blueprint/things/wallet/errors.js";
import type { ChainSetting } from "../chain/types.ts";
import type { Signer } from "../signer/types.ts";

export interface ServerApi {
  /**
   * The `keystore` signer for a server operation (K7 F5: a wallet may keep its key in a server's key store): a signer
   * holding one key, labelled `server`, whose secret the server was given as a `Redacted` binding. In M1 only a key the
   * world generated is given this way; real secrets come with M2.04 and the hygiene check with M6.18. A server operation
   * sends with `signer.send("server", to, value)` and gets the lifecycle a device does, simulated first, and the same
   * refusals. The secret is read once, here, and never answered, logged or put in a span. A secret that is no key is
   * `KeyLocked`, said in a log without it.
   */
  readonly keystore: (options: { readonly secret: Redacted.Redacted<string>; readonly chain: ChainSetting }) => Effect.Effect<Signer, KeyLocked>;
}
