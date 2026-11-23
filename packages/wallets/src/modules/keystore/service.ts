import { Effect } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import type { KeystoreApi } from "./types.ts";
import { addressOf, decrypt, encrypt } from "./internal/v3.ts";

export const Keystore: KeystoreApi = {
  cost: { standard: { n: 262_144, r: 8, p: 1 }, light: { n: 4_096, r: 8, p: 6 } },
  encrypt: (secret, passphrase, cost) =>
    Effect.gen(function* () {
      // The file names the address, so the secret must make one; a secret that is no key never gets a file.
      const key = yield* Keys.fromSecret(secret).pipe(Effect.orDie);
      return yield* encrypt(secret, passphrase, cost, key.address);
    }),
  decrypt,
  addressOf,
};
