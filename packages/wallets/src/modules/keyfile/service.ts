import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect, Option } from "effect";
import { Keys, type Address } from "@orthograph/chain-evm/device";
import { KeyLocked, NoSuchKey } from "../../../blueprint/things/wallet/errors.js";
import { Keystore } from "../keystore/service.ts";
import type { Held, Keyring } from "../signer/types.ts";
import type { KeyfileApi } from "./types.ts";
import { SUFFIX, fileOf, labelOf } from "./internal/names.ts";

const io = <A>(what: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: () => new Error(`the keystore folder could not be ${what}`) }).pipe(Effect.orDie);

const missing = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";

const lockedBecause = (why: string) => Effect.logInfo(why).pipe(Effect.andThen(Effect.fail(new KeyLocked({}))));

export const Keyfile: KeyfileApi = {
  keyring: ({ directory, passphrase, cost }): Keyring => {
    const locked = lockedBecause("the keystore is locked: no passphrase was given (ORTHO_WALLET_PASSPHRASE)");
    const held = Effect.gen(function* () {
      const names = yield* Effect.tryPromise({ try: () => readdir(directory), catch: (e) => e }).pipe(
        Effect.catch((e) => (missing(e) ? Effect.succeed([] as Array<string>) : Effect.die(new Error("the keystore folder could not be read")))),
      );
      const found = yield* Effect.forEach(names.filter((n) => n.endsWith(SUFFIX)).sort(), (name) =>
        io("read", () => readFile(join(directory, name), "utf8")).pipe(
          Effect.map((text): Option.Option<Held> => Option.map(Keystore.addressOf(text), (a) => ({ label: labelOf(name), address: Keys.checksum(`0x${a}` as Address) }))),
        ));
      return found.flatMap((h) => (Option.isSome(h) ? [h.value] : []));
    });
    return {
      held,
      put: (label, secret) =>
        Effect.gen(function* () {
          if (Option.isNone(passphrase)) return yield* locked;
          const key = yield* Keys.fromSecret(secret).pipe(Effect.catch(() => lockedBecause("the secret is no key")));
          const text = yield* Keystore.encrypt(secret, passphrase.value, cost);
          yield* io("made", () => mkdir(directory, { recursive: true, mode: 0o700 }));
          // `wx`: a file is never overwritten, so a key can't be lost to a repeated label.
          yield* io("written", () => writeFile(fileOf(directory, label), text, { flag: "wx", mode: 0o600 }));
          return { label, address: key.address };
        }),
      open: (label) =>
        Effect.gen(function* () {
          const text = yield* Effect.tryPromise({ try: () => readFile(fileOf(directory, label), "utf8"), catch: (e) => e }).pipe(
            Effect.catch((e) => (missing(e)
              ? Effect.logInfo(`no key labelled ${label} on the node signer`).pipe(Effect.andThen(Effect.fail(new NoSuchKey({}))))
              : Effect.die(new Error("the keystore file could not be read")))),
          );
          if (Option.isNone(passphrase)) return yield* locked;
          return yield* Keystore.decrypt(text, passphrase.value).pipe(
            Effect.catch((fault) => lockedBecause(fault.reason === "wrong-passphrase" ? "the keystore is locked: the passphrase does not open it" : "the keystore file is damaged")),
          );
        }),
    };
  },
};
