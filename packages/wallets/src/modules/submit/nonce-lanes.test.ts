// Two sends from one account on one chain, at once, on a real Anvil (skipped unless ORTHO_CHAIN_EVM_ANVIL=1).
// `Submit.withKey` takes `Chain.port(setting)` on every send, and each port has its own nonce manager, so two sends in
// flight each ask the chain for the account's next nonce and are both told the same one: they must share one lane.
// On today's code both prepare with nonce 0 before either is mined; the second submit is then refused or replaces the
// first, so the nonces are not distinct and the receiver is not up by both transfers.
import { Cause, Effect, Exit } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Signers } from "../signer/service.ts";

const balance = (url: string, address: string) =>
  Effect.promise(async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] });
    const answer = (await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json()) as { result: string };
    return BigInt(answer.result);
  });

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("two overlapping sends from one keyed account", () => {
  it("one after the other take nonces 0 and 1 (the control)", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
      const signer = Signers.keyed("world", { chainId: chain.chainId, rpcUrl: chain.rpcUrl, depth: 1 }, Signers.memory(new Map()));
      yield* signer.import("funded", mine.privateKey);
      const before = yield* balance(chain.rpcUrl, payee.address);
      const first = yield* signer.send("funded", payee.address, 1_000n);
      const second = yield* signer.send("funded", payee.address, 2_000n);
      expect([first.nonce, second.nonce]).toEqual([0n, 1n]);
      expect(yield* balance(chain.rpcUrl, payee.address)).toBe(before + 3_000n);
    }).pipe(Effect.provide(TimersLive)))));

  it("take distinct nonces, and both transfers land", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
      const setting = { chainId: chain.chainId, rpcUrl: chain.rpcUrl, depth: 1 };
      const signer = Signers.keyed("world", setting, Signers.memory(new Map()));
      yield* signer.import("funded", mine.privateKey);
      const before = yield* balance(chain.rpcUrl, payee.address);
      const results = yield* Effect.all(
        [signer.send("funded", payee.address, 1_000n).pipe(Effect.exit), signer.send("funded", payee.address, 2_000n).pipe(Effect.exit)],
        { concurrency: "unbounded" },
      );
      const sent = results.flatMap((r) => (Exit.isSuccess(r) ? [r.value] : []));
      const failed = results.flatMap((r) => (Exit.isFailure(r) ? [Cause.pretty(r.cause).split("\n")[0]] : []));
      expect(failed, "neither send fails").toEqual([]);
      expect(sent, "both sends are answered").toHaveLength(2);
      expect(new Set(sent.map((s) => s.nonce)).size, "the two sends take distinct nonces").toBe(2);
      expect(new Set(sent.map((s) => s.transaction)).size).toBe(2);
      expect(yield* balance(chain.rpcUrl, payee.address), "the receiver is up by both transfers").toBe(before + 3_000n);
    }).pipe(Effect.provide(TimersLive)))));
});
