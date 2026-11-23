// A chain that is not there on a signer's first send and is there on the second, on a real Anvil (skipped unless
// ORTHO_CHAIN_EVM_ANVIL=1). The endpoint is a port nothing listens on; the first send is a defect that says so, then Anvil
// starts on that very port. Failing to reach the chain is that send's failure, not the signer's for good: the next send must work.
import { createServer } from "node:net";
import { Cause, Effect, Exit } from "effect";
import { Anvil } from "@orthograph/chain-evm";
import { Keys } from "@orthograph/chain-evm/device";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Signers } from "../signer/service.ts";

const payee = "0x000000000000000000000000000000000000dEaD" as const;

const freePort = Effect.promise(
  () => new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const { port } = server.address() as { port: number }; server.close(() => resolve(port)); });
  }),
);

const rpc = (url: string, method: string, params: ReadonlyArray<unknown>) =>
  Effect.promise(async () => ((await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()) as { result: string }).result);

const say = (exit: Exit.Exit<unknown, unknown>) => (Exit.isSuccess(exit) ? "sent" : Cause.pretty(exit.cause).split("\n")[0]);

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a signer whose chain was unreachable on its first send", () => {
  it("sends once the chain is there: the first failure does not stick", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const port = yield* freePort;
      const rpcUrl = `http://127.0.0.1:${port}`;
      const signer = Signers.keyed("world", { chainId: 31_337, rpcUrl, depth: 1 }, Signers.memory(new Map()));
      const secret = yield* Keys.generate;
      const mine = yield* Keys.fromSecret(secret);
      yield* signer.import("funded", secret);
      const first = yield* signer.send("funded", payee, 1_000n).pipe(Effect.exit);
      expect(Exit.isFailure(first) && Cause.hasDies(first.cause), "nothing listens: the first send is a defect").toBe(true);
      yield* Anvil.start({ chainId: 31_337, port, accounts: 1 });
      yield* rpc(rpcUrl, "anvil_setBalance", [mine.address, "0xde0b6b3a7640000"]);
      const second = yield* signer.send("funded", payee, 1_000n).pipe(Effect.exit);
      expect(say(second), "the chain is there now").toBe("sent");
    }).pipe(Effect.provide(TimersLive)))));
});
