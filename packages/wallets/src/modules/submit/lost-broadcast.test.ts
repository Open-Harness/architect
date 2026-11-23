// A broadcast that never reaches the chain must not wedge the account, on a real Anvil (skipped unless
// ORTHO_CHAIN_EVM_ANVIL=1). Each test sends once and loses that broadcast, lets the first send end (it fails, or it is
// cut off after a bounded wait), then sends again from the same account on the same chain setting. The second send must be
// mined at the nonce the lost one had, and the receiver must be up by exactly its value. Nothing here names how nonces are
// kept: a fix that shares a port, drops it or asks the chain each time passes the same way. Every wait is bounded, so a
// wedged account fails with the message below instead of hanging.
//   1. the connection is cut on the first `eth_sendRawTransaction`, which is not forwarded (a proxy in front of Anvil);
//   2. Anvil mines nothing (automine off), the pending send is dropped with `anvil_dropTransaction`, and mining is back on.
import { createServer, request, type IncomingMessage, type Server } from "node:http";
import { Cause, Effect, Exit, Fiber } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Signers } from "../signer/service.ts";

const rpc = (url: string, method: string, params: ReadonlyArray<unknown> = []) =>
  Effect.promise(async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
    return ((await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json()) as { result: unknown }).result;
  });
const balance = (url: string, address: string) => Effect.map(rpc(url, "eth_getBalance", [address, "latest"]), (r) => BigInt(r as string));

/** A proxy to `target` that cuts the connection on the first `eth_sendRawTransaction`, forwarding nothing of it. */
const cutting = (target: string) => {
  const upstream = new URL(target);
  const state = { cut: 0 };
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Array<Buffer> = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      if (state.cut === 0 && body.toString().includes('"eth_sendRawTransaction"')) { state.cut += 1; req.socket.destroy(); return; }
      const out = request({ host: upstream.hostname, port: upstream.port, method: "POST", headers: { "content-type": "application/json", "content-length": body.length } }, (back) => {
        res.writeHead(back.statusCode ?? 200, back.headers);
        back.pipe(res);
      });
      out.on("error", () => res.destroy());
      out.end(body);
    });
  });
  return server;
};

const listening = (server: Server) =>
  Effect.acquireRelease(
    Effect.promise(() => new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port)))),
    () => Effect.promise(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); })),
  );

const why = (exit: Exit.Exit<unknown, unknown>) => (Exit.isSuccess(exit) ? "sent" : Cause.pretty(exit.cause).split("\n")[0]);
const WEDGED = "the second send did not land: the account is wedged behind a broadcast that never reached the chain";

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a send whose broadcast was lost", () => {
  it("a cut connection on eth_sendRawTransaction: the next send is mined at the lost send's nonce", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
      const proxy = cutting(chain.rpcUrl);
      const port = yield* listening(proxy);
      const signer = Signers.keyed("world", { chainId: chain.chainId, rpcUrl: `http://127.0.0.1:${port}`, depth: 1 }, Signers.memory(new Map()));
      yield* signer.import("funded", mine.privateKey);
      const before = yield* balance(chain.rpcUrl, payee.address);
      const first = yield* signer.send("funded", payee.address, 1_000n).pipe(Effect.timeout("10 seconds"), Effect.exit);
      expect(Exit.isSuccess(first), "the first send's broadcast was cut, so it cannot have been confirmed").toBe(false);
      const second = yield* signer.send("funded", payee.address, 2_000n).pipe(Effect.timeout("20 seconds"), Effect.exit);
      expect(Exit.isSuccess(second) ? "sent" : WEDGED, why(second)).toBe("sent");
      if (Exit.isSuccess(second)) expect(second.value.nonce, "it takes the nonce the lost send had").toBe(0n);
      expect(yield* balance(chain.rpcUrl, payee.address), "the receiver is up by the second send only").toBe(before + 2_000n);
    }).pipe(Effect.provide(TimersLive)))));

  it("a pending send dropped with anvil_dropTransaction: the next send is mined at the dropped send's nonce", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
      const signer = Signers.keyed("world", { chainId: chain.chainId, rpcUrl: chain.rpcUrl, depth: 1 }, Signers.memory(new Map()));
      yield* signer.import("funded", mine.privateKey);
      const before = yield* balance(chain.rpcUrl, payee.address);
      yield* rpc(chain.rpcUrl, "evm_setAutomine", [false]);
      const fiber = yield* Effect.forkChild(signer.send("funded", payee.address, 1_000n).pipe(Effect.timeout("10 seconds"), Effect.exit));
      // Wait (bounded) until the broadcast is pending in the pool, then drop it by its hash.
      let hash: string | undefined;
      for (let i = 0; i < 50 && hash === undefined; i += 1) {
        const pool = (yield* rpc(chain.rpcUrl, "txpool_content")) as { pending: Record<string, Record<string, { hash: string }>> };
        hash = Object.values(pool.pending).flatMap((byNonce) => Object.values(byNonce))[0]?.hash;
        if (hash === undefined) yield* Effect.sleep("100 millis");
      }
      expect(hash, "the first send reached the pool").toBeDefined();
      yield* rpc(chain.rpcUrl, "anvil_dropTransaction", [hash]);
      const first = yield* Fiber.join(fiber);
      expect(Exit.isSuccess(first), "the first send was dropped, so it cannot have been confirmed").toBe(false);
      yield* rpc(chain.rpcUrl, "evm_setAutomine", [true]);
      const second = yield* signer.send("funded", payee.address, 2_000n).pipe(Effect.timeout("20 seconds"), Effect.exit);
      expect(Exit.isSuccess(second) ? "sent" : WEDGED, why(second)).toBe("sent");
      if (Exit.isSuccess(second)) expect(second.value.nonce, "it takes the nonce the dropped send had").toBe(0n);
      expect(yield* balance(chain.rpcUrl, payee.address), "the receiver is up by the second send only").toBe(before + 2_000n);
    }).pipe(Effect.provide(TimersLive)))));
});
