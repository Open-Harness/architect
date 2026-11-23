// The four signers in a world, on a real Anvil: the journeys' eight steps for each, without prove. Skipped unless
// ORTHO_CHAIN_EVM_ANVIL=1 (Foundry's anvil on the PATH), as every test that starts a chain is.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Redacted } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { Keys } from "@orthograph/chain-evm/device";
import { DeviceWorld, type DeviceWorldOf, TimersLive } from "@orthograph/language-effect/device";
import { afterAll, describe, expect, it } from "vitest";
import { KeyLocked, NoSuchKey, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import { Account } from "../account/service.ts";
import { Operations } from "../operations/service.ts";
import { SIGNER_NAMES } from "../signer/types.ts";
import { WorldHost } from "./service.ts";

const folders: Array<string> = [];
afterAll(() => { for (const f of folders) rmSync(f, { recursive: true, force: true }); });

const account = /^eip155:[0-9]+:0x[0-9a-fA-F]{40}$/;
const doomed = 1_000_000_000_000_000_000_000_000_000_000n;

/** A world as prove makes one: a chain, a funded key per host, a folder, and a place to remember. */
const worldOn = Effect.gen(function* () {
  const chain = yield* Anvil.start({ chainId: 31_337, accounts: 5 });
  const hosts = ["node", "browser", "keystore", "world"] as const;
  const directory = mkdtempSync(join(tmpdir(), "ortho-wallets-"));
  folders.push(directory);
  const kept = new Map<string, unknown>();
  const world: DeviceWorldOf = {
    chain: { rpcUrl: chain.rpcUrl, chainId: chain.chainId, keys: Object.fromEntries(hosts.map((h, i) => [h, chain.accounts[i]!.privateKey])) },
    directory,
    remember: <A>(key: string, make: () => A) => {
      if (!kept.has(key)) kept.set(key, make());
      return kept.get(key) as A;
    },
  };
  const payee = Account.format({ chainId: chain.chainId, address: chain.accounts[4]!.address });
  const funded = yield* Effect.forEach(hosts, (h, i) => Effect.map(Keys.fromSecret(chain.accounts[i]!.privateKey), (k) => [h, Account.format({ chainId: chain.chainId, address: k.address })] as const));
  return { world, payee, funded: Object.fromEntries(funded), secrets: chain.accounts };
});

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("the wallet's signers in a world, on Anvil", () => {
  it.each(SIGNER_NAMES)("the %s signer: create, list, import, list, sign, send, a doomed send refused, the next send takes the next nonce", { timeout: 60_000 }, (signer) =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { world, payee, funded, secrets } = yield* worldOn;
      const ops = Operations.on(WorldHost.signer);
      const run = <A, E>(effect: Effect.Effect<A, E, DeviceWorld>) => effect.pipe(Effect.provideService(DeviceWorld, world));
      const made = yield* run(ops.create({ signer, label: "fresh" }));
      expect(made.account).toMatch(account);
      expect(made.wallet).toMatch(/^wal_[0-9a-z]{16}$/);
      expect((yield* run(ops.keys({ signer }))).count).toBe(1n);
      const index = ["node", "browser", "keystore", "world"].indexOf(signer);
      // A browser's wallet holds an account (named by its CAIP-10 text); the others take a secret key.
      const source = signer === "browser" ? funded["browser"]! : Redacted.value(secrets[index]!.privateKey);
      const imported = yield* run(ops.import({ signer, label: "funded", source }));
      expect(imported.account).toBe(funded[signer]);
      const listed = yield* run(ops.keys({ signer }));
      expect(listed.count).toBe(2n);
      expect(listed.accounts).toContain(funded[signer]!);
      expect(listed.accounts).not.toContain(Redacted.value(secrets[index]!.privateKey));
      const signed = yield* run(ops.sign({ signer, label: "funded", message: "orthograph wallet journey" }));
      expect(signed.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
      const first = yield* run(ops.send({ signer, label: "funded", to: payee, value: 1_000n }));
      expect([first.level, first.nonce]).toEqual(["confirmed", 0n]);
      expect(first.transaction).toMatch(/^0x[0-9a-fA-F]{64}$/);
      const refused = yield* run(ops.send({ signer, label: "funded", to: payee, value: doomed })).pipe(Effect.flip);
      expect(refused).toBeInstanceOf(SimulationReverted);
      const second = yield* run(ops.send({ signer, label: "funded", to: payee, value: 2_000n }));
      expect([second.level, second.nonce]).toEqual(["confirmed", 1n]);
    }).pipe(Effect.provide(TimersLive)))));

  it("a label that is not there is NoSuchKey, and a signer that is none is KeyLocked", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { world, payee } = yield* worldOn;
      const ops = Operations.on(WorldHost.signer);
      const run = <A, E>(effect: Effect.Effect<A, E, DeviceWorld>) => effect.pipe(Effect.provideService(DeviceWorld, world));
      expect(yield* run(ops.sign({ signer: "world", label: "nobody", message: "x" })).pipe(Effect.flip)).toBeInstanceOf(NoSuchKey);
      expect(yield* run(ops.send({ signer: "node", label: "nobody", to: payee, value: 1n })).pipe(Effect.flip)).toBeInstanceOf(NoSuchKey);
      expect(yield* run(ops.keys({ signer: "everyone" })).pipe(Effect.flip)).toBeInstanceOf(KeyLocked);
    }).pipe(Effect.provide(TimersLive)))));
});

