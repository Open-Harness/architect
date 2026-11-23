import { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import { createPublicClient, createTestClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { expect, test } from "vitest";
import { isDefinite } from "../../device.ts";
import { makeChainPort } from "../../main.ts";
import { fixtureRpc, liveFixtureTimers, withAnvil } from "./internal/anvil-fixture.ts";
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
    const held = yield* second.hold(account.address, 1);
    expect(held).toMatchObject({ nonce: 1 });
    expect(yield* second.hold(account.address, 1).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "nonce" });
    expect((yield* second.prepare({ from: account.address, to: recipient, value: 1n })).transaction.nonce).toBe(2);
    expect(yield* second.resume("0x1234", 0n).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "signing" });
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a nonce whose call failed after it was reserved is filled with a transfer to the sender, and the call queued behind it is mined", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    const publicClient = createPublicClient({ chain, transport });
    yield* fixtureRpc(() => testClient.setBalance({ address: account.address, value: 10n ** 18n }));
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: () => new Error("Anvil fixture signing failed") }).pipe(Effect.orDie),
    };
    const port = yield* makeChainPort({ chainId: chain.id, rpcUrl });
    const call = { from: account.address, to: recipient, value: 1n };
    const [a, b, c] = [yield* port.prepare(call), yield* port.prepare(call), yield* port.prepare(call)];
    const send = (unsigned: typeof a) => port.simulate(unsigned).pipe(Effect.andThen(port.sign(unsigned, signer)), Effect.flatMap(port.submit));
    yield* send(a);
    // The middle call fails after its nonce is reserved: nothing is sent for it, and its reservation is not given back.
    const queued = yield* send(c);
    const mined = (hash: `0x${string}`) => fixtureRpc(() => publicClient.getTransactionReceipt({ hash })).pipe(Effect.catch(() => Effect.succeed(undefined)));
    expect(yield* mined(queued.hash), "queued behind the missing nonce").toBeUndefined();
    const mine = port.reservationOf(b)!;
    // Only the owner can fill: a look-alike reservation (same sender, same nonce) is refused, and so is one that was never reserved here.
    expect(yield* port.fill({ ...mine }, signer).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "nonce" });
    const filler = yield* port.fill(mine, signer);
    expect(filler.prepared.transaction).toMatchObject({ nonce: b.transaction.nonce, to: account.address, value: 0n, gas: 21_000n });
    yield* port.submit(filler);
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    expect((yield* mined(queued.hash))?.status, "mined once the gap is filled").toBe("success");
    expect(yield* fixtureRpc(() => publicClient.getTransactionCount({ address: account.address }))).toBe(3);
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);


test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a refused broadcast keeps its nonce for its owner (keepOnReject): the fill lands once funded, and a new call takes the next nonce", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    const publicClient = createPublicClient({ chain, transport });
    const fund = (value: bigint) => fixtureRpc(() => testClient.setBalance({ address: account.address, value }));
    yield* fund(10n ** 18n);
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: () => new Error("Anvil fixture signing failed") }).pipe(Effect.orDie),
    };
    const port = yield* makeChainPort({ chainId: chain.id, rpcUrl, keepOnReject: true });
    const call = { from: account.address, to: recipient, value: 1n };
    const first = yield* port.prepare(call);
    yield* port.simulate(first);
    const signed = yield* port.sign(first, signer);
    const mine = port.reservationOf(first)!;
    yield* fund(0n);
    expect(yield* port.submit(signed).pipe(Effect.flip), "the node refuses it for want of funds").toMatchObject({ kind: "funds" });
    // The refusal gave the nonce back to nobody: it is still its owner's, and a fill is refused the same way while there is no money.
    const filler = yield* port.fill(mine, signer);
    expect(yield* port.submit(filler).pipe(Effect.flip)).toMatchObject({ kind: "funds" });
    yield* fund(10n ** 18n);
    expect((yield* port.prepare(call)).transaction.nonce, "a new call is not given the held nonce").toBe(first.transaction.nonce + 1);
    const again = yield* port.fill(mine, signer);
    yield* port.submit(again);
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    expect((yield* fixtureRpc(() => publicClient.getTransactionReceipt({ hash: again.hash }))).status, "the fill lands").toBe("success");
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a fee-cap refusal is final for its call: the error says so, the nonce stays held, nothing can replace it, and a fill lands", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    const publicClient = createPublicClient({ chain, transport });
    yield* fixtureRpc(() => testClient.setBalance({ address: account.address, value: 10n ** 20n }));
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: () => new Error("Anvil fixture signing failed") }).pipe(Effect.orDie),
    };
    const port = yield* makeChainPort({ chainId: chain.id, rpcUrl, keepOnReject: true });
    const call = { from: account.address, to: recipient, value: 1n };
    const first = yield* port.prepare(call);
    yield* port.simulate(first);
    const signed = yield* port.sign(first, signer);
    // The base fee rises after the transaction was priced: the node refuses it for a fee cap below the base fee.
    yield* fixtureRpc(() => testClient.setNextBlockBaseFeePerGas({ baseFeePerGas: 10n ** 11n }));
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    const refused = yield* port.submit(signed).pipe(Effect.flip);
    expect(refused, "the port says the refusal is final").toMatchObject({ _tag: "ChainFault", kind: "rejected" });
    expect(isDefinite(refused)).toBe(true);
    expect(yield* port.replace(signed, signer, { strategy: "speedup", maxFeePerGas: 10n ** 13n }).pipe(Effect.flip), "nothing was broadcast, so nothing is replaced").toMatchObject({ kind: "nonce" });
    const filler = yield* port.fill(port.reservationOf(first)!, signer);
    yield* port.submit(filler);
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    expect((yield* fixtureRpc(() => publicClient.getTransactionReceipt({ hash: filler.hash }))).status, "the fill lands").toBe("success");
    expect((yield* port.prepare(call)).transaction.nonce, "a later call goes through at the next nonce").toBe(first.transaction.nonce + 1);
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);

test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a broadcast refused for good (keepOnReject) is registered again by the next send of the same bytes, and lands", () =>
  Effect.runPromise(Effect.gen(function* () {
    const { chain, rpcUrl, transport } = yield* withAnvil;
    const account = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()));
    const recipient = yield* Effect.sync(() => privateKeyToAccount(generatePrivateKey()).address);
    const testClient = createTestClient({ chain, transport, mode: "anvil" });
    const publicClient = createPublicClient({ chain, transport });
    const fund = (value: bigint) => fixtureRpc(() => testClient.setBalance({ address: account.address, value }));
    yield* fund(10n ** 18n);
    const signer = {
      address: account.address,
      signTransaction: (transaction: Parameters<typeof account.signTransaction>[0]) =>
        Effect.tryPromise({ try: () => account.signTransaction(transaction), catch: () => new Error("Anvil fixture signing failed") }).pipe(Effect.orDie),
    };
    const port = yield* makeChainPort({ chainId: chain.id, rpcUrl, keepOnReject: true });
    const first = yield* port.prepare({ from: account.address, to: recipient, value: 1n });
    yield* port.simulate(first);
    const signed = yield* port.sign(first, signer);
    yield* fund(0n);
    expect(yield* port.submit(signed).pipe(Effect.flip), "refused for want of funds, and the port says it is final").toMatchObject({ kind: "funds" });
    yield* fund(10n ** 18n);
    yield* port.submit(signed);
    yield* fixtureRpc(() => testClient.mine({ blocks: 1 }));
    expect((yield* fixtureRpc(() => publicClient.getTransactionReceipt({ hash: signed.hash }))).status, "the same bytes land under their own hash").toBe("success");
  }).pipe(Effect.scoped, Effect.provideService(Timers, liveFixtureTimers))), 30_000);
