import { createServer, type Server } from "node:http";
import { Timers } from "@orthograph/language-effect";
import { Clock, Duration, Effect, Stream } from "effect";
import { expect, test } from "vitest";
import { makeChainPort } from "./service.ts";

const timer = Timers.of({
  at: () => Effect.die("The HTTP proof only needs sleeps"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

const listen = (server: Server) => Effect.callback<number, Error>((resume) => {
  server.once("error", (error) => resume(Effect.fail(error)));
  server.listen(0, "127.0.0.1", () => {
    const bound = server.address();
    if (typeof bound === "object" && bound !== null) resume(Effect.succeed(bound.port));
    else resume(Effect.fail(new Error("Could not bind the local RPC proof")));
  });
});

const close = (server: Server) => Effect.callback<void>((resume) => {
  server.close(() => resume(Effect.void));
  server.closeAllConnections();
});

test("cancels a stalled receipt RPC within the tracker budget", { timeout: 5_000 }, () =>
  Effect.runPromise(Effect.gen(function* () {
    let stalled = false;
    const server = createServer((request, response) => {
      request.setEncoding("utf8");
      let body = "";
      request.on("data", (chunk: string) => { body += chunk; });
      request.on("end", () => {
        if (body.includes("eth_chainId")) {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end('{"jsonrpc":"2.0","result":"0x7a69","id":0}');
        } else {
          stalled = true;
        }
      });
    });
    const port = yield* Effect.acquireRelease(listen(server), () => close(server));
    const evm = yield* makeChainPort({
      chainId: 31337, rpcUrl: `http://127.0.0.1:${port}`, receiptTimeoutMs: 250, pollIntervalMs: 1_000,
    });
    const result = yield* evm.track({
      hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
      from: "0x0000000000000000000000000000000000000001", nonce: 0, fromBlock: 0n,
    }, { depth: 1 }).pipe(Stream.runHead, Effect.flip);
    expect(stalled).toBe(true);
    expect(result).toMatchObject({ _tag: "ChainFault", kind: "timeout" });
  }).pipe(Effect.scoped, Effect.provideService(Timers, timer))));
