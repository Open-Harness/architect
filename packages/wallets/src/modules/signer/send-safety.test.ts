// A browser wallet on another chain than the wallet is set for, on a real Anvil (skipped unless ORTHO_CHAIN_EVM_ANVIL=1).
// `Submit.withProvider` checks and simulates against the configured chain only, so `provided.send` has to ask the
// provider's `eth_chainId` itself and refuse a mismatch before `eth_sendTransaction` is ever called. The provider here is
// an EIP-1193 shape in front of the real Anvil (an impersonated account, as a wallet's own key); it records what it was asked.
import { Effect, Logger } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Signers } from "./service.ts";
import type { Eip1193 } from "./types.ts";

const rpc = async (url: string, method: string, params: ReadonlyArray<unknown> = []) => {
  const answer = (await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()) as { result?: unknown; error?: { message: string } };
  if (answer.error !== undefined) throw new Error(answer.error.message);
  return answer.result;
};

/** A browser wallet: it answers `eth_chainId` as `walletChain`, and everything else by passing it to the chain as the account's own. */
const wallet = (url: string, account: string, walletChain: string) => {
  const asked: Array<string> = [];
  const provider: Eip1193 = {
    request: async ({ method, params = [] }) => {
      asked.push(method);
      if (method === "eth_chainId") return walletChain;
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [account];
      return rpc(url, method, params);
    },
  };
  return { provider, asked };
};

const setup = Effect.gen(function* () {
  const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
  const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
  yield* Effect.promise(() => rpc(chain.rpcUrl, "anvil_impersonateAccount", [mine.address]));
  return { chain, mine, payee, setting: { chainId: chain.chainId, rpcUrl: chain.rpcUrl, depth: 1 } };
});

const balance = (url: string, address: string) => Effect.promise(async () => BigInt((await rpc(url, "eth_getBalance", [address, "latest"])) as string));

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a browser signer sending while its wallet is on another chain", () => {
  it("refuses, naming both chains, and never calls eth_sendTransaction (wallet on 0x1, wallet set for 31337)", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { chain, mine, payee, setting } = yield* setup;
      const { provider, asked } = wallet(chain.rpcUrl, mine.address, "0x1");
      const signer = Signers.provided("browser", setting, provider, Signers.labelsInMemory(new Map()));
      yield* signer.create("w");
      const before = yield* balance(chain.rpcUrl, payee.address);
      const outcome = yield* signer.send("w", payee.address, 1_000n).pipe(Effect.result);
      // On today's code the wallet is never asked its chain: the send goes out on whichever chain it is on.
      expect(asked, "the signer must ask the provider eth_chainId").toContain("eth_chainId");
      expect(asked, "nothing is sent on the wrong chain").not.toContain("eth_sendTransaction");
      expect(outcome._tag, "a send on the wrong chain is a refusal").toBe("Failure");
      expect(yield* balance(chain.rpcUrl, payee.address)).toBe(before);
    }).pipe(Effect.provide(TimersLive)))));

  it("says both chains in the log when it refuses (the wallet's 1 and the setting's 31337)", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { chain, mine, payee, setting } = yield* setup;
      const { provider } = wallet(chain.rpcUrl, mine.address, "0x1");
      const signer = Signers.provided("browser", setting, provider, Signers.labelsInMemory(new Map()));
      yield* signer.create("w");
      const logged: Array<string> = [];
      const logger = Effect.provide(signer.send("w", payee.address, 1_000n).pipe(Effect.ignore), Logger.layer([Logger.make(({ message }) => { logged.push(Array.isArray(message) ? message.join(" ") : String(message)); })]));
      yield* logger;
      const said = logged.join("\n");
      expect(said, "the refusal names the wallet's chain").toMatch(/\b1\b|0x1\b/);
      expect(said, "the refusal names the configured chain").toMatch(/31337|0x7a69/);
    }).pipe(Effect.provide(TimersLive)))));

  it("sends when the wallet's chain is the setting's, as eth_chainId answers it in hex (the control)", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { chain, mine, payee, setting } = yield* setup;
      const { provider, asked } = wallet(chain.rpcUrl, mine.address, "0x7a69");
      const signer = Signers.provided("browser", setting, provider, Signers.labelsInMemory(new Map()));
      yield* signer.create("w");
      const before = yield* balance(chain.rpcUrl, payee.address);
      const sent = yield* signer.send("w", payee.address, 1_000n);
      expect(sent.level).toBe("confirmed");
      expect(asked).toContain("eth_sendTransaction");
      expect(yield* balance(chain.rpcUrl, payee.address)).toBe(before + 1_000n);
    }).pipe(Effect.provide(TimersLive)))));
});
