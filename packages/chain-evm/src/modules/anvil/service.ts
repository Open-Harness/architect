import { createServer } from "node:net";
import { Effect } from "effect";
import { AnvilFailed, type AnvilApi } from "./types.ts";
import { fundedAccounts } from "./internal/accounts.ts";
import { spawnAnvil, stopAnvil } from "./internal/process.ts";
import { untilReady } from "./internal/ready.ts";

const freePort = Effect.callback<number, AnvilFailed>((resume) => {
  const server = createServer();
  const fail = () => resume(Effect.fail(new AnvilFailed({ message: "no loopback port was free" })));
  server.once("error", fail);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => (address !== null && typeof address === "object" ? resume(Effect.succeed(address.port)) : fail()));
  });
});

export const Anvil: AnvilApi = {
  start: (options = {}) =>
    Effect.gen(function* () {
      const chainId = options.chainId ?? 31337;
      const port = options.port ?? (yield* freePort);
      const rpcUrl = `http://127.0.0.1:${port}`;
      const anvil = yield* Effect.acquireRelease(
        spawnAnvil(options.binary ?? "anvil", port, chainId, options.blockTime),
        ({ child }) => stopAnvil(child),
      );
      yield* untilReady(rpcUrl, chainId, anvil);
      const accounts = yield* fundedAccounts(rpcUrl, options.accounts ?? 3, options.balance ?? 10_000n * 10n ** 18n);
      return { rpcUrl, chainId, pid: anvil.child.pid!, accounts, printed: anvil.printed };
    }).pipe(Effect.withSpan("chain.evm.anvil.start")),
};
