import { execFileSync } from "node:child_process";
import { Clock, Duration, Effect, Exit, Redacted, Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import { createPublicClient, http } from "viem";
import { expect, test } from "vitest";
import { Anvil } from "./service.ts";
import { anvilArgs } from "./internal/process.ts";

const timers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used to wait for Anvil"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const argv = (pid: number) => execFileSync("ps", ["-o", "args=", "-p", String(pid)], { encoding: "utf8" });
// Anvil's well-known dev key 0, which a silent anvil with no dev accounts must never print.
const DEV_KEY_ZERO = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

test("the arguments always carry --silent, stay on loopback and make no dev accounts", () => {
  expect(anvilArgs(19261, 31337)).toEqual([
    "--silent", "--host", "127.0.0.1", "--port", "19261", "--chain-id", "31337", "--accounts", "0",
  ]);
});

test("a block time is the one argument that may follow, so that blocks come without a transaction", () => {
  expect(anvilArgs(19261, 31337, 1).slice(-2)).toEqual(["--block-time", "1"]);
});

test("a missing binary is a typed failure, not a hang or a throw", () =>
  Effect.runPromise(Effect.scoped(Anvil.start({ binary: "anvil-that-is-not-installed" }).pipe(Effect.flip, Effect.provideService(Timers, timers))))
    .then((error) => expect(error).toMatchObject({ _tag: "AnvilFailed", message: "the anvil binary was not found or could not start" })));

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a world's chain answers eth_chainId, holds no printed key, and is gone when the scope ends", { timeout: 20_000 }, () =>
  Effect.runPromise(Effect.gen(function* () {
    const scope = yield* Scope.make();
    const chain = yield* Anvil.start({ chainId: 31_999, accounts: 2 }).pipe(Scope.provide(scope));
    const client = createPublicClient({ transport: http(chain.rpcUrl, { retryCount: 0, timeout: 1_000 }) });

    expect(yield* Effect.promise(() => client.getChainId())).toBe(31_999);
    expect(alive(chain.pid)).toBe(true);

    // The keys are the world's: two funded accounts, redacted when shown, and in nothing Anvil was given or printed.
    expect(chain.accounts).toHaveLength(2);
    const keys = chain.accounts.map((account) => Redacted.value(account.privateKey));
    for (const account of chain.accounts) {
      expect(String(account.privateKey)).toBe("<redacted>");
      expect(yield* Effect.promise(() => client.getBalance({ address: account.address }))).toBe(10_000n * 10n ** 18n);
    }
    expect(chain.printed()).toBe("");
    const args = argv(chain.pid);
    expect(args).toContain("--silent");
    for (const secret of [...keys, DEV_KEY_ZERO]) {
      expect(chain.printed()).not.toContain(secret.slice(2));
      expect(args).not.toContain(secret.slice(2));
    }
    // Anvil's own dev accounts are not made.
    expect(yield* Effect.promise(() => client.request({ method: "eth_accounts" } as never))).toEqual([]);

    yield* Scope.close(scope, Exit.void);
    expect(alive(chain.pid)).toBe(false);
    const after = yield* Effect.promise(() => client.getChainId().then(() => "answered", () => "gone"));
    expect(after).toBe("gone");
  }).pipe(Effect.provideService(Timers, timers))));
