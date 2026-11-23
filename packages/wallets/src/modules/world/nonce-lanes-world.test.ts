// Overlapping sends the way the operation handlers make them, on a real Anvil (skipped unless ORTHO_CHAIN_EVM_ANVIL=1):
// every operation asks the host for its signer (`WorldHost.signer`), so each call has a signer object of its own. A nonce
// lane kept per signer object leaves these two sends on two lanes: both reserve the same nonce and the chain refuses one.
// A lane must belong to the account on the chain, not to the object a call happened to be handed.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit, Redacted } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { DeviceWorld, type DeviceWorldOf, TimersLive } from "@orthograph/language-effect/device";
import { afterAll, describe, expect, it } from "vitest";
import { Account } from "../account/service.ts";
import { Operations } from "../operations/service.ts";
import { WorldHost } from "./service.ts";

const folders: Array<string> = [];
afterAll(() => { for (const f of folders) rmSync(f, { recursive: true, force: true }); });

const balance = (url: string, address: string) =>
  Effect.promise(async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] });
    return BigInt(((await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json()) as { result: string }).result);
  });

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("two operation calls, each with the signer its host made for it", () => {
  it("take distinct nonces from one account, and both transfers land", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const directory = mkdtempSync(join(tmpdir(), "ortho-wallets-"));
      folders.push(directory);
      const kept = new Map<string, unknown>();
      const world: DeviceWorldOf = {
        chain: { rpcUrl: chain.rpcUrl, chainId: chain.chainId, keys: { world: chain.accounts[0]!.privateKey } },
        directory,
        remember: <A>(key: string, make: () => A) => {
          if (!kept.has(key)) kept.set(key, make());
          return kept.get(key) as A;
        },
      };
      const payee = chain.accounts[1]!.address;
      const to = Account.format({ chainId: chain.chainId, address: payee });
      const ops = Operations.on(WorldHost.signer);
      const run = <A, E>(effect: Effect.Effect<A, E, DeviceWorld>) => effect.pipe(Effect.provideService(DeviceWorld, world));
      yield* run(ops.import({ signer: "world", label: "funded", source: Redacted.value(chain.accounts[0]!.privateKey) }));
      const before = yield* balance(chain.rpcUrl, payee);
      const results = yield* Effect.all(
        [run(ops.send({ signer: "world", label: "funded", to, value: 1_000n })).pipe(Effect.exit), run(ops.send({ signer: "world", label: "funded", to, value: 2_000n })).pipe(Effect.exit)],
        { concurrency: "unbounded" },
      );
      const failed = results.flatMap((r) => (Exit.isFailure(r) ? [Cause.pretty(r.cause).split("\n")[0]] : []));
      expect(failed, "neither send fails").toEqual([]);
      const sent = results.flatMap((r) => (Exit.isSuccess(r) ? [r.value] : []));
      expect(new Set(sent.map((s) => s.nonce)).size, "the two sends take distinct nonces").toBe(2);
      expect(yield* balance(chain.rpcUrl, payee), "the receiver is up by both transfers").toBe(before + 3_000n);
    }).pipe(Effect.provide(TimersLive)))));
});
