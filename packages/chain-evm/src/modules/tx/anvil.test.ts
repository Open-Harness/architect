import { spawn, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import { createServer } from "node:net";
import { Clock, Duration, Effect, Option, Stream } from "effect";
import { Timers } from "@orthograph/language-effect";
import {
  createPublicClient, createTestClient, createWalletClient, decodeEventLog, encodeFunctionData, http, parseAbi,
  toFunctionSelector, TransactionReceiptNotFoundError, type TransactionReceipt,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { test, expect } from "vitest";
import { makeChainPort, makeEventSource } from "../../main.ts";
// Compiled from internal/anvil-token.sol with solcjs 0.8.30 --optimize --bin.
const tokenBytecode = "0x6080604052348015600e575f5ffd5b50335f8181526020818152604080832060649081905590519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a361023f806100615f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c806370a0823114610043578063a9059cbb14610075578063ad50950314610098575b5f5ffd5b610062610051366004610187565b5f6020819052908152604090205481565b6040519081526020015b60405180910390f35b6100886100833660046101a7565b6100a1565b604051901515815260200161006c565b61009f5f5ffd5b005b335f90815260208190526040812054828110156100df5760405163cf47918160e01b8152600481018290526024810184905260440160405180910390fd5b6100e983826101e3565b335f90815260208190526040808220929092556001600160a01b0386168152908120805485929061011b9084906101f6565b90915550506040518381526001600160a01b0385169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a360019150505b92915050565b80356001600160a01b0381168114610182575f5ffd5b919050565b5f60208284031215610197575f5ffd5b6101a08261016c565b9392505050565b5f5f604083850312156101b8575f5ffd5b6101c18361016c565b946020939093013593505050565b634e487b7160e01b5f52601160045260245ffd5b81810381811115610166576101666101cf565b80820180821115610166576101666101cf56fea264697066735822122058493ecce12a37a55d5e8d6f308cd1c95de936a4216d2f8ea1b8fd249107090364736f6c634300081e0033" as const;

const abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function refuseEmpty() pure",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "error InsufficientBalance(uint256 available, uint256 requested)",
]);
const signature = "InsufficientBalance(uint256,uint256)";
const refusal = {
  code: "TOKEN-001",
  name: "InsufficientBalance",
  selector: toFunctionSelector(signature),
  signature,
  abi: abi[4],
} as const;

const freePort = Effect.callback<number, Error>((resume) => {
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

function startAnvil(port: number, chainId: number) {
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

function stopAnvil(child: ChildProcess) {
  return Effect.callback<void>((resume) => {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
      resume(Effect.void);
      return;
    }
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGKILL");
  });
}

function fixtureRpc<A>(request: () => Promise<A>) {
  // A viem diagnostic can embed its request, including submitted bytes. Report a fixed fixture failure instead.
  return Effect.tryPromise({ try: request, catch: () => new Error("Anvil fixture RPC failed") });
}

function waitForFixtureReceipt(request: () => Promise<TransactionReceipt>) {
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

const liveFixtureTimers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used in the local Anvil proof"),
  // Anvil runs in its own OS process, so the fixture drives the Timers service with real time.
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

const withAnvil = Effect.gen(function* () {
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

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("transfers ERC20, decodes reverts, and corrects a reorg on Anvil", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport, publicClient } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    const wallet = createWalletClient({ chain, transport, account });
    yield* fixtureRpc(() => testClient.setBalance({ address: account.address, value: 10n ** 18n }));
    const deployed = yield* fixtureRpc(() => wallet.deployContract({ abi, bytecode: tokenBytecode }));
    const deployment = yield* waitForFixtureReceipt(() => publicClient.getTransactionReceipt({ hash: deployed }));
    const token = deployment.contractAddress;
    if (!token) return yield* Effect.fail(new Error("The ERC20 fixture failed to deploy"));

    const port = yield* makeChainPort({
      chainId: chain.id, rpcUrl, pollIntervalMs: 25, receiptTimeoutMs: 2_000, refusals: [refusal],
    });
    const transfer = (value: bigint) => ({
      from: account.address, to: token,
      data: encodeFunctionData({ abi, functionName: "transfer", args: [recipient, value] }),
    });
    // Keep an empty block between deployment and transfer so the follower has a common ancestor to rewind to.
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    const snapshot = yield* fixtureRpc(() => testClient.snapshot());
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({
          try: () => account.signTransaction(transaction),
          catch: () => new Error("Anvil fixture signing failed"),
        }).pipe(Effect.orDie),
    };
    const unsigned = yield* port.prepare(transfer(7n));
    // No path signs or sends before the transaction has simulated cleanly (M1.32).
    expect(yield* port.sign(unsigned, signer).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "unsimulated" });
    yield* port.simulate(unsigned);
    const signed = yield* port.sign(unsigned, signer);
    const submission = yield* port.submit(signed);
    const included = yield* port.track(submission, { depth: 1 }).pipe(Stream.runHead);
    expect(Option.isSome(included)).toBe(true);
    if (Option.isNone(included) || included.value._tag !== "Included") {
      return yield* Effect.fail(new Error("The submitted transfer was not included"));
    }
    const receipt = included.value.receipt;
    expect(receipt.status).toBe("success");
    const log = receipt.logs[0];
    if (!log) return yield* Effect.fail(new Error("The transfer receipt did not contain a log"));
    expect(decodeEventLog({ abi, eventName: "Transfer", topics: log.topics, data: log.data })).toMatchObject({
      eventName: "Transfer", args: { from: account.address, to: recipient, value: 7n },
    });
    expect(yield* fixtureRpc(() => publicClient.readContract({
      address: token, abi, functionName: "balanceOf", args: [recipient],
    }))).toBe(7n);
    expect(yield* port.prepare(transfer(94n)).pipe(Effect.flip)).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-001", name: "InsufficientBalance", args: { available: 93n, requested: 94n },
    });
    // A reverting call returns its typed error from the simulation, and nothing is sent: the same nonce, the same head.
    const headBefore = yield* fixtureRpc(() => publicClient.getBlockNumber({ cacheTime: 0 }));
    const countBefore = yield* fixtureRpc(() => publicClient.getTransactionCount({ address: account.address, blockTag: "pending" }));
    const reverting = yield* port.prepare({ ...transfer(94n), gas: 100_000n });
    expect(yield* port.simulate(reverting).pipe(Effect.flip)).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-001", name: "InsufficientBalance", args: { available: 93n, requested: 94n },
    });
    expect(yield* port.sign(reverting, signer).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "unsimulated" });
    yield* port.release(reverting);
    expect(yield* fixtureRpc(() => publicClient.getBlockNumber({ cacheTime: 0 }))).toBe(headBefore);
    expect(yield* fixtureRpc(() => publicClient.getTransactionCount({ address: account.address, blockTag: "pending" }))).toBe(countBefore);
    const empty = yield* port.prepare({
      from: account.address, to: token, data: encodeFunctionData({ abi, functionName: "refuseEmpty" }),
    }).pipe(Effect.flip);
    expect(empty).toMatchObject({ _tag: "ChainFault", kind: "revert" });

    const source = makeEventSource(abi[3], token, deployment.blockNumber + 1n);
    const follower = port.follow(source, { depth: 1 });
    const args = { from: account.address, to: recipient, value: 7n };
    const observed = yield* follower.poll();
    expect(observed.changes).toContainEqual(expect.objectContaining({
      _tag: "Confirmed", event: expect.objectContaining({ args }),
    }));

    yield* fixtureRpc(() => testClient.revert({ id: snapshot }));
    yield* fixtureRpc(() => testClient.increaseTime({ seconds: 60 }));
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    const corrected = yield* follower.poll(observed.checkpoint);
    expect(corrected.changes).toContainEqual(expect.objectContaining({
      _tag: "Corrected", event: expect.objectContaining({ args }), wasConfirmed: true,
    }));
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 15_000);

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("probes a submission, and a port that never saw it takes it back from its signed bytes and replaces it", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    yield* fixtureRpc(() => testClient.setBalance({ address: account.address, value: 10n ** 18n }));
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: () => new Error("Anvil fixture signing failed") }).pipe(Effect.orDie),
    };
    const open = makeChainPort({ chainId: chain.id, rpcUrl });
    const first = yield* open;
    yield* fixtureRpc(() => testClient.setAutomine(false));
    const unsigned = yield* first.prepare({ from: account.address, to: recipient, value: 1n });
    yield* first.simulate(unsigned);
    const signed = yield* first.sign(unsigned, signer);
    const submission = yield* first.submit(signed);
    expect((yield* first.probe(submission))._tag).toBe("Held");
    yield* fixtureRpc(() => testClient.dropTransaction({ hash: signed.hash }));
    expect((yield* first.probe(submission))._tag).toBe("Dropped");

    // A restart: a new port has no memory of the transaction, and takes it back from the bytes kept.
    const second = yield* open;
    const back = yield* second.resume(signed.serialized, submission.fromBlock);
    expect(back.hash).toBe(signed.hash);
    expect(back.prepared.transaction).toMatchObject({ nonce: unsigned.transaction.nonce, to: recipient.toLowerCase(), value: 1n });
    expect(yield* second.resume(signed.serialized, submission.fromBlock).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "nonce" });
    const next = yield* second.replace(back, signer, { strategy: "speedup", maxFeePerGas: 10n ** 12n });
    const again = yield* second.submit(next);
    expect(next.hash).not.toBe(signed.hash);
    expect((yield* second.probe(again))._tag).toBe("Held");
    yield* fixtureRpc(() => testClient.setAutomine(true));
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    expect(yield* second.probe(again)).toMatchObject({ _tag: "Included", receipt: { transactionHash: next.hash, status: "success" } });
    // The first hash was never mined, and the same call took its nonce under the new hash: it reads as included under that hash.
    expect(yield* second.probe(submission)).toMatchObject({ _tag: "Included", receipt: { transactionHash: next.hash } });
    // A held nonce is skipped by prepare, and cannot be held twice.
    yield* second.hold(account.address, 1);
    expect(yield* second.hold(account.address, 1).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "nonce" });
    expect((yield* second.prepare({ from: account.address, to: recipient, value: 1n })).transaction.nonce).toBe(2);
    expect(yield* second.resume("0x1234", 0n).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "signing" });
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);
