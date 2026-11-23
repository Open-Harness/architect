import { Effect } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import { NoSuchKey } from "../../../../blueprint/things/wallet/errors.js";
import type { Keyring, LabelBook, SignersApi } from "../types.ts";
import { locked } from "./keyed.ts";

export const memory: SignersApi["memory"] = (store): Keyring => ({
  held: Effect.sync(() => [...store].map(([label, { address }]) => ({ label, address }))),
  put: (label, secret) =>
    Effect.gen(function* () {
      const key = yield* Keys.fromSecret(secret).pipe(Effect.catch(() => locked("the secret is no key")));
      store.set(label, { secret, address: key.address });
      return { label, address: key.address };
    }),
  open: (label) =>
    Effect.gen(function* () {
      const found = store.get(label);
      if (found === undefined) return yield* Effect.logInfo(`no key labelled ${label} on this signer`).pipe(Effect.andThen(Effect.fail(new NoSuchKey({}))));
      return found.secret;
    }),
});

export const labelsInMemory = (book: Map<string, string>): LabelBook => ({
  read: Effect.sync(() => Object.fromEntries(book)),
  write: (next) => Effect.sync(() => { book.clear(); for (const [label, address] of Object.entries(next)) book.set(label, address); }),
});
