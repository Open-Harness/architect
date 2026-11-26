import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { Abi, type Address, type Hex } from "@orthograph/chain-evm/device";
import { SafeCalls, SafeClient, SafeRefused, SafeTx, SafeWorld, type SafeTransaction } from "../../main.ts";
import {
  ABI, SENTINEL, ZERO, approvedSignature, balanceOf, deploySafe, freshOwner, ownerSignature, read, sendTx, setBalance, txCount, withWorld,
  type World,
} from "../world/internal/testing.ts";

// Needs Foundry's Anvil on PATH, as CI's check-static has it. Every expected value on chain is read by the check itself
// (testing.ts's `read`), never through the package; signatures are made by the check (spikes/safe-hats-module/README.md:30-52).
const TIMEOUT = { timeout: 60_000 };
const RECIPIENT: Address = "0x00000000000000000000000000000000000ca5a1";
const SOME: SafeTransaction = {
  to: "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359", value: 11n, data: "0xdeadbeef", operation: 1, safeTxGas: 5n, baseGas: 6n, gasPrice: 7n,
  gasToken: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", refundReceiver: "0x8fC4AF618430430a01522137f6d0b5930446c39B", nonce: 4n,
};
type Owner = Effect.Success<typeof freshOwner>;
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const pays = (to: Address, value: bigint, nonce: bigint): SafeTransaction => ({
  to, value, data: "0x", operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: ZERO, refundReceiver: ZERO, nonce,
});
const calls = (to: Address, data: Hex, nonce: bigint): SafeTransaction => ({ ...pays(to, 0n, nonce), data });

/** An installed world with one Safe owned by a fresh owner the check holds the key of, holding 1 ether. */
const withSafe = <A, E>(body: (input: World & { safe: Address; owner: Owner }) => Effect.Effect<A, E, never>) =>
  withWorld((world) => Effect.gen(function* () {
    yield* SafeWorld.install(world.rpcUrl);
    const owner = yield* freshOwner;
    const safe = yield* deploySafe(world, owner.key.address, 42n);
    yield* setBalance(world.rpcUrl, safe, 10n ** 18n);
    return yield* body({ ...world, safe, owner });
  }));

const onChain = (world: World, safe: Address) => {
  const from = world.keys[1]!.address;
  return {
    owners: read(world.port, from, safe, ABI.getOwners).pipe(Effect.map(([owners]) => owners)),
    threshold: read(world.port, from, safe, ABI.getThreshold).pipe(Effect.map(([threshold]) => threshold)),
    nonce: read(world.port, from, safe, ABI.nonce).pipe(Effect.map(([nonce]) => nonce as bigint)),
    hash: (tx: SafeTransaction) => read(world.port, from, safe, ABI.getTransactionHash, [
      tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.nonce,
    ]).pipe(Effect.map(([hash]) => hash as Hex)),
  };
};

describe("SafeCalls, the Safe's own call data", () => {
  test("execTransaction carries every field but the nonce, in Safe's order, then the signatures", () =>
    run(Effect.gen(function* () {
      const signatures: Hex = `0x${"ab".repeat(65)}`;
      expect(yield* SafeCalls.execTransaction(SOME, signatures)).toBe(yield* Abi.encodeCall(ABI.execTransaction, [
        SOME.to, SOME.value, SOME.data, SOME.operation, SOME.safeTxGas, SOME.baseGas, SOME.gasPrice, SOME.gasToken, SOME.refundReceiver, signatures,
      ]));
    })));

  test("approveHash, swapOwner and addOwnerWithThreshold", () =>
    run(Effect.gen(function* () {
      const hash: Hex = `0x${"5a".repeat(32)}`;
      const [a, b, c] = ["0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359", RECIPIENT] as const;
      expect(yield* SafeCalls.approveHash(hash)).toBe(yield* Abi.encodeCall(ABI.approveHash, [hash]));
      expect(yield* SafeCalls.swapOwner(a, b, c)).toBe(yield* Abi.encodeCall(ABI.swapOwner, [a, b, c]));
      expect(yield* SafeCalls.addOwnerWithThreshold(c, 2n)).toBe(yield* Abi.encodeCall(ABI.addOwnerWithThreshold, [c, 2n]));
    })));
});

describe("on Anvil, a SafeTx's digest is the Safe's getTransactionHash", () => {
  test.each([
    ["a payment at nonce 0", pays(RECIPIENT, 1000n, 0n)],
    ["a call with data at a later nonce", calls(RECIPIENT, "0xdeadbeef", 5n)],
    ["a delegatecall with every gas and refund field set", SOME],
  ] as const)("for %s", (_name, tx) => withSafe((world) => Effect.gen(function* () {
    expect(SafeTx.digest(world.chainId, world.safe, tx)).toBe(yield* onChain(world, world.safe).hash(tx));
  })), 60_000);
});

describe("on Anvil, the reads", () => {
  test("owners, threshold and nonce of a new Safe, and again after an owner is added at threshold 2", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const chain = onChain(world, world.safe);
      expect(yield* SafeClient.owners(world.port, world.safe)).toStrictEqual([world.owner.key.address]);
      expect(yield* SafeClient.threshold(world.port, world.safe)).toBe(1n);
      expect(yield* SafeClient.nonce(world.port, world.safe)).toBe(0n);

      const director = yield* freshOwner;
      const tx = calls(world.safe, yield* Abi.encodeCall(ABI.addOwnerWithThreshold, [director.key.address, 2n]), 0n);
      const data = yield* Abi.encodeCall(ABI.execTransaction, [
        tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver,
        ownerSignature(world.owner.secret, yield* chain.hash(tx)),
      ]);
      yield* sendTx(world.port, world.keys[1]!, world.safe, data);

      expect(yield* chain.owners).toStrictEqual([director.key.address, world.owner.key.address]);
      expect(yield* SafeClient.owners(world.port, world.safe)).toStrictEqual([director.key.address, world.owner.key.address]);
      expect(yield* SafeClient.threshold(world.port, world.safe)).toBe(2n);
      expect(yield* SafeClient.nonce(world.port, world.safe)).toBe(1n);
    })));
});

describe("on Anvil, execTransaction sent by someone who is not an owner", () => {
  test("pays on the owner's signature and moves the nonce on by one", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const chain = onChain(world, world.safe);
      const tx = pays(RECIPIENT, 1000n, 0n);
      const data = yield* SafeCalls.execTransaction(tx, ownerSignature(world.owner.secret, yield* chain.hash(tx)));
      const receipt = yield* SafeClient.send(world.port, world.keys[1]!.signer, { safe: world.safe, data });
      expect(receipt.status).toBe("success");
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
      expect(yield* chain.nonce).toBe(1n);
    })));

  test("a replayed SafeTx is refused GS026, typed, before anything is sent", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const chain = onChain(world, world.safe);
      const stranger = world.keys[1]!;
      const tx = pays(RECIPIENT, 1000n, 0n);
      const data = yield* SafeCalls.execTransaction(tx, ownerSignature(world.owner.secret, yield* chain.hash(tx)));
      yield* SafeClient.send(world.port, stranger.signer, { safe: world.safe, data });
      const sent = yield* txCount(world.rpcUrl, stranger.address);

      const refused = yield* SafeClient.send(world.port, stranger.signer, { safe: world.safe, data }).pipe(Effect.flip);
      expect(refused).toBeInstanceOf(SafeRefused);
      expect(refused).toMatchObject({ _tag: "SafeRefused", code: "GS026", safe: world.safe });
      expect(yield* txCount(world.rpcUrl, stranger.address)).toBe(sent);
      expect(yield* chain.nonce).toBe(1n);
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
    })));

  test("a SafeTx signed by someone who is not an owner is refused GS026", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const intruder = yield* freshOwner;
      const tx = pays(RECIPIENT, 1000n, 0n);
      const data = yield* SafeCalls.execTransaction(tx, ownerSignature(intruder.secret, yield* onChain(world, world.safe).hash(tx)));
      expect(yield* SafeClient.send(world.port, world.keys[1]!.signer, { safe: world.safe, data }).pipe(Effect.flip))
        .toMatchObject({ _tag: "SafeRefused", code: "GS026", safe: world.safe });
    })));

  test("no signatures at all is refused GS020", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const data = yield* SafeCalls.execTransaction(pays(RECIPIENT, 1000n, 0n), "0x");
      expect(yield* SafeClient.send(world.port, world.keys[1]!.signer, { safe: world.safe, data }).pipe(Effect.flip))
        .toMatchObject({ _tag: "SafeRefused", code: "GS020", safe: world.safe });
    })));
});

describe("on Anvil, approveHash", () => {
  test("an owner approves a SafeTx's hash, then anyone executes it on that approval; an unapproved one is refused GS025", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const chain = onChain(world, world.safe);
      yield* setBalance(world.rpcUrl, world.owner.key.address, 10n ** 17n);
      const first = pays(RECIPIENT, 1000n, 0n);
      const approve = yield* SafeCalls.approveHash(yield* chain.hash(first));
      expect((yield* SafeClient.send(world.port, world.owner.key.signer, { safe: world.safe, data: approve })).status).toBe("success");

      const stranger = world.keys[1]!.signer;
      const executed = yield* SafeCalls.execTransaction(first, approvedSignature(world.owner.key.address));
      expect((yield* SafeClient.send(world.port, stranger, { safe: world.safe, data: executed })).status).toBe("success");
      expect(yield* chain.nonce).toBe(1n);

      const unapproved = yield* SafeCalls.execTransaction(pays(RECIPIENT, 1000n, 1n), approvedSignature(world.owner.key.address));
      expect(yield* SafeClient.send(world.port, stranger, { safe: world.safe, data: unapproved }).pipe(Effect.flip))
        .toMatchObject({ _tag: "SafeRefused", code: "GS025", safe: world.safe });
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
    })));
});

describe("on Anvil, swapOwner through a SafeTx", () => {
  test("swaps the owner for a new one; a swap naming the wrong previous owner fails inside, refused GS013", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const chain = onChain(world, world.safe);
      const stranger = world.keys[1]!.signer;
      const next = yield* freshOwner;
      const swap = calls(world.safe, yield* SafeCalls.swapOwner(SENTINEL, world.owner.key.address, next.key.address), 0n);
      const data = yield* SafeCalls.execTransaction(swap, ownerSignature(world.owner.secret, yield* chain.hash(swap)));
      yield* SafeClient.send(world.port, stranger, { safe: world.safe, data });
      expect(yield* chain.owners).toStrictEqual([next.key.address]);

      const wrong = calls(world.safe, yield* SafeCalls.swapOwner(world.keys[2]!.address, next.key.address, RECIPIENT), 1n);
      const refused = yield* SafeCalls.execTransaction(wrong, ownerSignature(next.secret, yield* chain.hash(wrong)));
      expect(yield* SafeClient.send(world.port, stranger, { safe: world.safe, data: refused }).pipe(Effect.flip))
        .toMatchObject({ _tag: "SafeRefused", code: "GS013", safe: world.safe });
      expect(yield* chain.owners).toStrictEqual([next.key.address]);
    })));
});
