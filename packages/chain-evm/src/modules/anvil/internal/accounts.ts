import { Effect, Redacted } from "effect";
import { createTestClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { AnvilFailed, type TestAccount } from "../types.ts";

/** Make `count` keys here and fund their addresses over RPC: Anvil never sees, holds or prints a key. */
export const fundedAccounts = (rpcUrl: string, count: number, balance: bigint) =>
  Effect.gen(function* () {
    const keys = yield* Effect.sync(() => Array.from({ length: count }, () => generatePrivateKey() as Hex));
    const accounts: ReadonlyArray<TestAccount> = keys.map((key) => ({ address: privateKeyToAddress(key), privateKey: Redacted.make(key) }));
    const client = createTestClient({ mode: "anvil", transport: http(rpcUrl, { retryCount: 0, timeout: 2_000 }) });
    for (const account of accounts) {
      yield* Effect.tryPromise({
        try: () => client.setBalance({ address: account.address, value: balance }),
        catch: () => new AnvilFailed({ message: "anvil refused to fund a test account" }),
      });
    }
    return accounts;
  });
