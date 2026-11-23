import type { Effect } from "effect";
import type { Signer, SignerName } from "../signer/types.ts";

export interface NodeHostApi {
  /**
   * The signers a Node process has (the CLI, a script, the SDK run from Node). `node` is an encrypted keystore folder:
   * `ORTHO_WALLET_HOME` (default `~/.orthograph/wallets`), locked with `ORTHO_WALLET_PASSPHRASE`; without a passphrase its
   * keys can be listed and nothing opened (`KeyLocked`). The chain is `ORTHO_WALLET_CHAIN` and `ORTHO_WALLET_RPC_URL`.
   * `browser` (a page's wallet), `keystore` (a server's, M2.04) and `world` are absent here: they refuse as `KeyLocked`.
   */
  readonly signer: (name: SignerName) => Effect.Effect<Signer>;
}
