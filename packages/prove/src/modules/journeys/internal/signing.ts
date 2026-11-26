// A journey's cast members signing (CX-journey-signs): one world key per person per run, made with chain-evm's
// `Keys.generate` and held by `@orthograph/wallets`' keystore signer, so the secret only ever leaves as signatures. A key is
// made the first time its person signs or a step names their `signer`, and is gone with the run: never kept, logged,
// written or put in the run.
import { Effect, type Redacted } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import { Scripting } from "orthograph/server";

/** The keystore signer as prove uses it: the address of the one key it holds, and EIP-191 signatures by it. */
interface KeystoreSigner {
  readonly keys: Effect.Effect<ReadonlyArray<{ readonly label: string; readonly address: string }>, unknown>;
  readonly sign: (label: string, message: string) => Effect.Effect<string, unknown>;
}
/** What prove reads of `@orthograph/wallets/server` (`Server.keystore`), written out: the package ships built JavaScript only. */
interface WalletsServer {
  readonly Server: {
    readonly keystore: (options: {
      readonly secret: Redacted.Redacted<string>;
      readonly chain: { readonly chainId: number; readonly rpcUrl: string | undefined; readonly depth: number | undefined };
    }) => Effect.Effect<KeystoreSigner, unknown>;
  };
}

// Loaded when a journey first signs, so a project that never signs needs no built `wallets` (its exports are its `dist`).
const WALLETS: string = "@orthograph/wallets/server";
const wallets = Effect.tryPromise({
  try: () => import(WALLETS) as Promise<WalletsServer>,
  catch: (e) => `signing needs ${WALLETS} built (nx build wallets): ${e instanceof Error ? e.message : String(e)}`,
});

/** A signature needs no chain: the local chain's id, with nowhere to send. */
const CHAIN = { chainId: 31337, rpcUrl: undefined, depth: undefined } as const;

/** What went wrong in a library call, by its tag or name and never its contents. */
const named = (e: unknown) =>
  typeof e === "string" ? e : ((e as { readonly _tag?: string; readonly name?: string } | null)?._tag ?? (e as { readonly name?: string } | null)?.name ?? "an error");

/** The names whose `signer` a value names (`cast.<name>.signer`): refs in it, its arrays and its plain objects. */
export const signersIn = (value: unknown, found: Set<string> = new Set()): ReadonlySet<string> => {
  if (Scripting.isRef(value)) {
    const path = Scripting.pathOf(value);
    if (path[0] === "cast" && path[2] === "signer" && path[1] !== undefined) found.add(path[1]);
  } else if (Array.isArray(value)) {
    for (const v of value) signersIn(v, found);
  } else if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    for (const v of Object.values(value)) signersIn(v, found);
  }
  return found;
};

/** The values inside a step's checks that may name a signer: never the declarations a check names. */
export const checkValues = (checks: ReadonlyArray<unknown>): ReadonlyArray<unknown> =>
  checks.map((c) => {
    const check = c as { readonly value?: unknown; readonly fields?: unknown; readonly id?: unknown };
    return [check.value, check.fields, check.id];
  });

/**
 * The keys of one journey run. `people` are those who may hold one (not the system, a service or the keeper); `onKey` is
 * told each new key's address, for the run's `cast.<name>.signer`.
 */
export const signersFor = (people: ReadonlySet<string>, onKey: (name: string, address: string) => void) => {
  const held = new Map<string, { readonly signer: KeystoreSigner; readonly label: string; readonly address: string }>();
  const keyOf = (name: string) =>
    Effect.gen(function* () {
      const kept = held.get(name);
      if (kept !== undefined) return kept;
      const { Server } = yield* wallets;
      // Through the module's own export, at the moment of signing: the platform's random source, `Redacted` from its first line.
      const signer = yield* Server.keystore({ secret: yield* Keys.generate, chain: CHAIN }).pipe(Effect.mapError((e) => `${name}'s key couldn't be held: ${named(e)}`));
      const [key] = yield* signer.keys.pipe(Effect.mapError((e) => `${name}'s key couldn't be read: ${named(e)}`));
      if (key === undefined) return yield* Effect.fail(`${name}'s key couldn't be read: the keystore holds none`);
      const made = { signer, label: key.label, address: key.address };
      held.set(name, made);
      onKey(name, key.address);
      return made;
    });
  return {
    /** Make the keys of these names, those who may hold one, so their `signer` reads as an address. */
    ensure: (names: ReadonlySet<string>) => Effect.forEach([...names].filter((n) => people.has(n)), keyOf, { discard: true }),
    /** `{ message, signature, signer }` for `text`, by `name`'s key; a cast member with no key is a failure naming them. */
    sign: (name: string, what: string, text: string) =>
      Effect.gen(function* () {
        if (!people.has(name)) return yield* Effect.fail(`${name} has no key: ${what} signs nothing`);
        const key = yield* keyOf(name);
        const signature = yield* key.signer.sign(key.label, text).pipe(Effect.mapError((e) => `${name}'s key couldn't sign: ${named(e)}`));
        return { message: text, signature, signer: key.address };
      }),
  };
};
