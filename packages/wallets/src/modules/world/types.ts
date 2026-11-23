import type { Effect } from "effect";
import type { DeviceWorld } from "@orthograph/language-effect/device";
import type { Signer, SignerName } from "../signer/types.ts";

export interface WorldHostApi {
  /**
   * The signers a world has, for the `*.world.js` entries prove runs in place of a device. All four are there, each kept
   * the way its host keeps it, but with the world's own folder, passphrase and funded keys:
   * - `node`: encrypted keystore files in the world's folder, at light scrypt cost, locked with a passphrase the world made;
   * - `keystore`: a server's key store, in memory (in M1 only a test key the world generated);
   * - `world`: the world's test wallets, in memory;
   * - `browser`: a test EIP-1193 provider holding the world's funded browser account and one more with nothing in it,
   *   for `create` to take.
   * The chain is the one the world stood; with none, accounts still make and sign, and a send is a defect.
   */
  readonly signer: (name: SignerName) => Effect.Effect<Signer, never, DeviceWorld>;
}
