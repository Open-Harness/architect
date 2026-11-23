import type { Effect } from "effect";
import type { Signer, SignerName } from "../signer/types.ts";

export interface BrowserHostApi {
  /**
   * The signers a browser has. `browser` is the wallet its page was given as `window.ethereum` (EIP-1193), with labels kept
   * in the page's `localStorage` (memory, when there is none); with no wallet it is absent, as are the others (`node` is a
   * file on a person's machine, `keystore` lives on a server, `world` only in a world). The chain comes from
   * `globalThis.ORTHOGRAPH_WALLET`, a plain object of `ORTHO_WALLET_CHAIN` and `ORTHO_WALLET_RPC_URL`.
   */
  readonly signer: (name: SignerName) => Effect.Effect<Signer>;
}
