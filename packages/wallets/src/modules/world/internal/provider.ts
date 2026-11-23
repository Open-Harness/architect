// A test EIP-1193 provider: the wallet a browser would have, held by the world. Two accounts (one empty for `create` to
// take, one funded), signing here, and everything else asked of the world's chain over JSON-RPC.
import { Cause, Effect, Semaphore } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { Keys, makeChainPort, type Key } from "@orthograph/chain-evm/device";
import type { ChainSetting } from "../../chain/types.ts";
import type { Eip1193 } from "../../signer/types.ts";

interface Request { readonly method: string; readonly params?: ReadonlyArray<unknown> }

const hexText = (hex: string) => new TextDecoder().decode(Uint8Array.from(hex.slice(2).match(/../g) ?? [], (byte) => parseInt(byte, 16)));

/** A provider's own error: EIP-1193 rejects with an object that has a `code` and a `message`. */
const failure = (message: string) => ({ code: -32000, message });

const rpc = (url: string, { method, params = [] }: Request) =>
  Effect.tryPromise({
    try: () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json() as Promise<{ result?: unknown; error?: { message: string } }>),
    catch: () => failure("the chain did not answer"),
  }).pipe(Effect.flatMap((answer) => (answer.error === undefined ? Effect.succeed(answer.result) : Effect.fail(failure(answer.error.message)))));

const handle = (queue: Semaphore.Semaphore, chain: ChainSetting & { readonly rpcUrl: string }, keys: ReadonlyArray<Key>, { method, params = [] }: Request): Effect.Effect<unknown, { code: number; message: string }> => {
  const addresses = keys.map((k) => k.address);
  const keyOf = (address: unknown) => keys.find((k) => typeof address === "string" && k.address.toLowerCase() === address.toLowerCase());
  switch (method) {
    case "eth_accounts":
    case "eth_requestAccounts":
      return Effect.succeed(addresses);
    case "eth_chainId":
      return Effect.succeed(`0x${chain.chainId.toString(16)}`);
    case "personal_sign": {
      const key = keyOf(params[1]);
      return key === undefined || typeof params[0] !== "string"
        ? Effect.fail(failure("personal_sign: that account is not this wallet's"))
        : key.signMessage(hexText(params[0])).pipe(Effect.mapError(() => failure("the key could not sign")));
    }
    case "eth_sendTransaction": {
      const tx = (params[0] ?? {}) as { from?: string; to?: string; value?: string };
      const key = keyOf(tx.from);
      if (key === undefined || tx.to === undefined || !Keys.isAddress(tx.to)) return Effect.fail(failure("eth_sendTransaction: no such account, or nowhere to send"));
      const to = tx.to;
      // As a real wallet's own queue does: one send at a time, so each reads the nonce the one before took.
      return queue.withPermit(Effect.gen(function* () {
        const port = yield* makeChainPort({ chainId: chain.chainId, rpcUrl: chain.rpcUrl, pollIntervalMs: 250 });
        const unsigned = yield* port.prepare({ from: key.address, to, value: BigInt(tx.value ?? "0x0") });
        yield* port.simulate(unsigned).pipe(Effect.tapError(() => port.release(unsigned)));
        const signed = yield* port.sign(unsigned, key.signer);
        return (yield* port.submit(signed)).hash;
      })).pipe(Effect.provide(TimersLive), Effect.mapError((e) => failure(`eth_sendTransaction: ${e._tag === "ChainRefusal" ? e.name : e.message}`)));
    }
    default:
      return rpc(chain.rpcUrl, { method, params });
  }
};

/** The provider over `keys` (the first is the one with nothing in it). */
export const testProvider = (chain: ChainSetting, keys: ReadonlyArray<Key>): Eip1193 => {
  const queue = Semaphore.makeUnsafe(1);
  return {
  request: (args) =>
    chain.rpcUrl === undefined
      ? Promise.reject(failure("this world has no chain"))
      : Effect.runPromiseExit(handle(queue, { ...chain, rpcUrl: chain.rpcUrl }, keys, args)).then((exit) =>
        exit._tag === "Success" ? exit.value : Promise.reject(Cause.squash(exit.cause))),
};
};
