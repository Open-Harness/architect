import { spawn, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import { createServer } from "node:net";
import { Clock, Duration, Effect, Option } from "effect";
import { Timers } from "@orthograph/language-effect";
import { createPublicClient, http, TransactionReceiptNotFoundError, type TransactionReceipt } from "viem";
import { foundry } from "viem/chains";
import { expect } from "vitest";

// An Anvil of its own for a test, and the small helpers the chain-evm Anvil tests share.
export const freePort = Effect.callback<number, Error>((resume) => {
  const server = createServer();
  server.once("error", (error) => resume(Effect.fail(error)));
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close((error) => {
      if (error) resume(Effect.fail(error));
      else if (address && typeof address === "object") resume(Effect.succeed(address.port));
      else resume(Effect.fail(new Error("Could not reserve a loopback port")));
    });
  });
});

export function startAnvil(port: number, chainId: number) {
  return Effect.sync(() => {
    // Match the K7 spike's silent native launch. Discard all child output before it reaches the test runner.
    const child = spawn(process.env["ORTHO_ANVIL_BIN"] ?? "anvil", [
      "--silent", "--host", "127.0.0.1", "--port", String(port), "--chain-id", String(chainId),
    ], { stdio: "ignore" });
    const startupError = { error: undefined as Error | undefined };
    child.once("error", (error) => { startupError.error = error; });
    return { child, startupError };
  });
}

export function stopAnvil(child: ChildProcess) {
  return Effect.callback<void>((resume) => {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
      resume(Effect.void);
      return;
    }
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGKILL");
  });
}

export function fixtureRpc<A>(request: () => Promise<A>) {
  // A viem diagnostic can embed its request, including submitted bytes. Report a fixed fixture failure instead.
  return Effect.tryPromise({ try: request, catch: () => new Error("Anvil fixture RPC failed") });
}

export function waitForFixtureReceipt(request: () => Promise<TransactionReceipt>) {
  return Effect.gen(function* () {
    const timers = yield* Timers;
    for (let attempt = 0; attempt < 100; attempt++) {
      const receipt = yield* Effect.tryPromise({ try: request, catch: (cause) => cause }).pipe(
        Effect.catch((cause) => cause instanceof TransactionReceiptNotFoundError
          ? Effect.succeed(undefined)
          : Effect.fail(new Error("Anvil fixture receipt RPC failed"))),
      );
      if (receipt) return receipt;
      yield* timers.sleep("Anvil test receipt", "25 millis");
    }
    return yield* Effect.fail(new Error("Anvil fixture receipt did not arrive within the fixture budget"));
  });
}

export const liveFixtureTimers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used in the local Anvil proof"),
  // Anvil runs in its own OS process, so the fixture drives the Timers service with real time.
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

export const withAnvil = Effect.gen(function* () {
  const timers = yield* Timers;
  const port = yield* freePort;
  // A fresh chain ID prevents touching another process if it claims the port between reserve and spawn.
  const chain = { ...foundry, id: yield* Effect.sync(() => randomInt(10_000, 2_147_483_647)) };
  const { child, startupError } = yield* Effect.acquireRelease(startAnvil(port, chain.id), ({ child }) => stopAnvil(child));
  const rpcUrl = new URL(`http://127.0.0.1:${port}`).toString();
  const transport = http(rpcUrl, { retryCount: 0, timeout: 500 });
  const publicClient = createPublicClient({ chain, transport });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError.error || child.exitCode !== null || child.signalCode !== null) {
      return yield* Effect.fail(new Error("Anvil exited before RPC became ready"));
    }
    const chainId = yield* Effect.option(fixtureRpc(() => publicClient.getChainId()));
    if (Option.isSome(chainId)) {
      expect(chainId.value).toBe(chain.id);
      return { chain, rpcUrl, transport, publicClient };
    }
    yield* timers.sleep("Anvil test startup", "25 millis");
  }
  return yield* Effect.fail(new Error("Anvil RPC did not start within the fixture budget"));
});

