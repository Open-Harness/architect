// A send cancelled after `prepare` reserved its nonce and before it broadcast, on a real Anvil (skipped unless
// ORTHO_CHAIN_EVM_ANVIL=1). The port is shared by every send of a signer, so a nonce a cancelled send keeps reserved is
// skipped by every later send from that account: they take a higher nonce, leave a gap, and are never mined. The send's
// cleanup (`settle`) must run on interruption too, not only on a typed failure.
//
// The seam is the endpoint: a small HTTP proxy in front of the real Anvil that holds the simulation's `eth_call` until
// the test lets it go. The test interrupts the fiber while it is held (prepare is done, nothing is signed or sent).
//
// A defect at the same point has no real seam here: the chain port turns every fault of the endpoint (a dropped
// connection, a garbled answer, an error body) into a typed `ChainFault` that `tapError` already settles, and the key
// is a plain secret the keyring hands over, so nothing a test can supply makes `simulate`, `sign` or `submit` die.
import { createServer, request, type IncomingMessage, type Server } from "node:http";
import { Effect, Exit, Fiber } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Signers } from "../signer/service.ts";

/** A proxy to `target` that holds any `eth_call` while `hold.on` and says when one arrives. */
const proxy = (target: string) => {
  const hold = { on: false, arrived: undefined as undefined | (() => void) };
  const upstream = new URL(target);
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Array<Buffer> = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const forward = () => {
        const out = request({ host: upstream.hostname, port: upstream.port, method: "POST", headers: { "content-type": "application/json", "content-length": body.length } }, (back) => {
          res.writeHead(back.statusCode ?? 200, back.headers);
          back.pipe(res);
        });
        out.on("error", () => res.destroy());
        out.end(body);
      };
      const holding = hold.on && body.toString().includes('"eth_call"');
      if (holding) { hold.arrived?.(); return; } // never answered: the send is stuck in its simulation
      forward();
    });
  });
  return { hold, server };
};

const balance = (url: string, address: string) =>
  Effect.promise(async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] });
    return BigInt(((await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json()) as { result: string }).result);
  });

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a keyed send interrupted after it reserved its nonce", () => {
  it("gives the nonce back: the next send from the account is mined at that nonce", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [mine, payee] = chain.accounts as [(typeof chain.accounts)[number], (typeof chain.accounts)[number]];
      const { hold, server } = proxy(chain.rpcUrl);
      yield* Effect.acquireRelease(
        Effect.promise(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))),
        () => Effect.promise(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); })),
      );
      const { port } = server.address() as { port: number };
      const signer = Signers.keyed("world", { chainId: chain.chainId, rpcUrl: `http://127.0.0.1:${port}`, depth: 1 }, Signers.memory(new Map()));
      yield* signer.import("funded", mine.privateKey);
      const before = yield* balance(chain.rpcUrl, payee.address);

      const stuck = new Promise<void>((resolve) => { hold.arrived = resolve; });
      hold.on = true;
      const cancelled = yield* Effect.forkChild(signer.send("funded", payee.address, 1_000n));
      yield* Effect.promise(() => stuck); // prepare has reserved the nonce; the simulation is held
      yield* Fiber.interrupt(cancelled);
      hold.on = false;

      const next = yield* signer.send("funded", payee.address, 2_000n).pipe(Effect.timeout("20 seconds"), Effect.exit);
      expect(Exit.isSuccess(next) ? "sent" : "the next send did not land (its nonce is above the one the cancelled send kept)", "the next send is mined").toBe("sent");
      if (Exit.isSuccess(next)) expect(next.value.nonce, "it takes the nonce the cancelled send gave up").toBe(0n);
      expect(yield* balance(chain.rpcUrl, payee.address), "the receiver is up by the second send only").toBe(before + 2_000n);
    }).pipe(Effect.provide(TimersLive)))));
});
