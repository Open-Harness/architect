// A signer whose keys sit in a keyring here: the node's keystore file, a server's key store, a world's test wallets.
import { Effect, Redacted } from "effect";
import { Keys, type Hex } from "@orthograph/chain-evm/device";
import { KeyLocked } from "../../../../blueprint/things/wallet/errors.js";
import { Chain } from "../../chain/service.ts";
import { Submit } from "../../submit/service.ts";
import type { ChainSetting } from "../../chain/types.ts";
import type { Keyring, Signer, SignerName } from "../types.ts";

/** A signer that could not use the key: said in a log first, so the refusal explains itself. */
export const locked = (why: string) => Effect.logInfo(why).pipe(Effect.andThen(Effect.fail(new KeyLocked({}))));

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** What a secret is, or a refusal that never says it. */
const keyOf = (secret: Redacted.Redacted<string>) =>
  Keys.fromSecret(secret).pipe(Effect.catch(() => locked("the secret is no key: it must be 0x and 64 hex digits")));

export const keyed = (name: SignerName, chain: ChainSetting, ring: Keyring): Signer => {
  // One port for this signer, made on its first send: every send shares its nonce lane.
  const port = Chain.shared(chain);
  return {
  name,
  chain,
  create: (label) =>
    Effect.gen(function* () {
      const found = (yield* ring.held).find((h) => h.label === label);
      if (found !== undefined) return found;
      return yield* ring.put(label, yield* Keys.generate);
    }),
  import: (label, source) =>
    Effect.gen(function* () {
      const key = yield* keyOf(source);
      const found = (yield* ring.held).find((h) => h.label === label);
      if (found === undefined) return yield* ring.put(label, source as Redacted.Redacted<Hex>);
      // A label is never overwritten: the same key is answered as it is, another is refused.
      return same(found.address, key.address) ? found : yield* locked(`the label ${label} on the ${name} signer already holds another key`);
    }),
  keys: ring.held,
  sign: (label, message) =>
    Effect.gen(function* () {
      const key = yield* keyOf(yield* ring.open(label));
      return yield* key.signMessage(message).pipe(Effect.catch(() => locked("the key could not sign")));
    }),
  send: (label, to, value) =>
    Effect.gen(function* () {
      const key = yield* keyOf(yield* ring.open(label));
      return yield* Submit.withKey(chain, port, key.signer, to, value);
    }),
};
};
