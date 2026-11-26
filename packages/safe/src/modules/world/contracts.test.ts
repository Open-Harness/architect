import { Effect, Option, Stream } from "effect";
import { describe, expect, test } from "vitest";
import {
  Abi, type AbiDocument, type AbiFunction, type Address, type ChainError, type ChainPort, type Hex, type Signer, type Submission,
  type TransactionReceipt,
} from "@orthograph/chain-evm/device";
import { SafeAddress, SafeRefusal, SafeRefused, SafeTx, SafeWorld, type SafeTransaction } from "../../index.ts";
import {
  CANON, SENTINEL, ZERO, approvedSignature, balanceOf, deploySafe, expectedInitializer, freshOwner, keccak, ownerSignature, setBalance, txCount,
  withWorld, type World,
} from "./internal/testing.ts";

// The Safe's own calls, reads and events are the generated `Safe` and `SafeProxyFactory` modules (`src/generated/`, the shape
// `ortho new adapter --from-abi` makes: packages/generators/src/modules/abi/README.md, A1 #1164). These checks drive them on
// Anvil, typed as that shape says, with the hand-written SafeTx digest and SafeRefusal beside them. Every expected value is read
// on chain or made by the check (testing.ts). Needs Foundry's Anvil on PATH, as CI's check-static has it.

type Chain = { readonly port: ChainPort; readonly address: Address; readonly from?: Address };
interface SafeTxArgs {
  readonly to: Address; readonly value: bigint; readonly data: Hex; readonly operation: bigint; readonly safeTxGas: bigint;
  readonly baseGas: bigint; readonly gasPrice: bigint; readonly gasToken: Address; readonly refundReceiver: Address;
}
type Read<A> = Effect.Effect<A, ChainError>;
type Write = Effect.Effect<Submission, ChainError>;
interface SafeModule {
  readonly abi: AbiDocument;
  readonly at: (chain: Chain) => {
    readonly getOwners: () => Read<ReadonlyArray<Address>>;
    readonly getThreshold: () => Read<bigint>;
    readonly nonce: () => Read<bigint>;
    readonly VERSION: () => Read<string>;
    readonly isModuleEnabled: (args: { readonly module: Address }) => Read<boolean>;
    readonly getTransactionHash: (args: SafeTxArgs & { readonly _nonce: bigint }) => Read<Hex>;
    readonly execTransaction: (args: SafeTxArgs & { readonly signatures: Hex }, signer: Signer, options?: { readonly value: bigint }) => Write;
    readonly approveHash: (args: { readonly hashToApprove: Hex }, signer: Signer) => Write;
    readonly swapOwner: (args: { readonly prevOwner: Address; readonly oldOwner: Address; readonly newOwner: Address }, signer: Signer) => Write;
  };
}
interface FactoryModule {
  readonly at: (chain: Chain) => {
    readonly createProxyWithNonce: (args: { readonly _singleton: Address; readonly initializer: Hex; readonly saltNonce: bigint }, signer: Signer) => Write;
    readonly proxyCreationCode: () => Read<Hex>;
  };
}

/** The generated modules, as the package's front door exports them (`export * from "./generated/index.ts"`). */
const generated = Effect.promise(() => import("../../index.ts")).pipe(Effect.flatMap((front) => {
  const { Safe, SafeProxyFactory } = front as unknown as { readonly Safe?: SafeModule; readonly SafeProxyFactory?: FactoryModule };
  return Safe === undefined || SafeProxyFactory === undefined
    ? Effect.fail(new Error("@orthograph/safe exports no generated Safe and SafeProxyFactory modules (src/generated/, A1's shape)"))
    : Effect.succeed({ Safe, SafeProxyFactory });
}));

const TIMEOUT = { timeout: 60_000 };
const RECIPIENT: Address = "0x00000000000000000000000000000000000ca5a1";
const args = (tx: SafeTransaction): SafeTxArgs => ({
  to: tx.to, value: tx.value, data: tx.data, operation: BigInt(tx.operation), safeTxGas: tx.safeTxGas, baseGas: tx.baseGas,
  gasPrice: tx.gasPrice, gasToken: tx.gasToken, refundReceiver: tx.refundReceiver,
});
const pays = (to: Address, value: bigint, nonce: bigint): SafeTransaction => ({
  to, value, data: "0x", operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: ZERO, refundReceiver: ZERO, nonce,
});
const calls = (to: Address, data: Hex, nonce: bigint): SafeTransaction => ({ ...pays(to, 0n, nonce), data });
/** An item of the generated ABI, by name: the check encodes the Safe's self-calls with the package's own ABI. */
const itemOf = (abi: AbiDocument, name: string) => {
  const item = abi.find((entry): entry is AbiFunction => entry.type === "function" && entry.name === name);
  return item === undefined ? Effect.fail(new Error(`The generated Safe ABI has no function ${name}`)) : Effect.succeed(item);
};
const mined = (port: ChainPort, submission: Submission) =>
  port.track(submission, { depth: 1 }).pipe(Stream.runHead, Effect.flatMap((head) =>
    Option.isSome(head) && head.value._tag === "Included"
      ? Effect.succeed<TransactionReceipt>(head.value.receipt)
      : Effect.fail(new Error("The transaction was not included"))));

type Owner = Effect.Success<typeof freshOwner>;
/** An installed world with one Safe (deployed by the check itself) owned by a fresh owner, holding 1 ether. */
const withSafe = <A, E>(body: (input: World & { safe: Address; owner: Owner; mods: Effect.Success<typeof generated> }) => Effect.Effect<A, E, never>) =>
  withWorld((world) => Effect.gen(function* () {
    yield* SafeWorld.install(world.rpcUrl);
    const mods = yield* generated;
    const owner = yield* freshOwner;
    const safe = yield* deploySafe(world, owner.key.address, 42n);
    yield* setBalance(world.rpcUrl, safe, 10n ** 18n);
    return yield* body({ ...world, safe, owner, mods });
  }));

describe("the generated SafeProxyFactory on an installed world", () => {
  test("createProxyWithNonce deploys a Safe at the predicted address", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const { SafeProxyFactory } = yield* generated;
      const factory = SafeProxyFactory.at({ port: world.port, address: CANON.proxyFactory });
      expect(keccak(yield* factory.proxyCreationCode())).toBe("0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f");
      const { key } = yield* freshOwner;
      const predicted = yield* SafeAddress.predict({ owners: [key.address], saltNonce: 9n });
      const submission = yield* factory.createProxyWithNonce(
        { _singleton: CANON.singleton, initializer: yield* expectedInitializer([key.address]), saltNonce: 9n }, world.keys[0]!.signer);
      expect((yield* mined(world.port, submission)).status).toBe("success");
      const { Safe } = yield* generated;
      expect(yield* Safe.at({ port: world.port, address: predicted }).getOwners()).toStrictEqual([key.address]);
    })));
});

describe("the generated Safe's reads on an installed world", () => {
  test("version, owners, threshold, nonce and the 4337 module, as owners are added at threshold 1 and then 2", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const { Safe } = yield* generated;
      // Three owners in an order that is neither sorted nor reversed: the Safe lists the newest first, so it lists [mid, high, low].
      const [low, mid, high] = [yield* freshOwner, yield* freshOwner, yield* freshOwner]
        .sort((a, b) => a.key.address.toLowerCase().localeCompare(b.key.address.toLowerCase()));
      const address = yield* deploySafe(world, low!.key.address, 43n);
      const safe = Safe.at({ port: world.port, address });
      expect(yield* safe.VERSION()).toBe("1.4.1");
      expect(yield* safe.getOwners()).toStrictEqual([low!.key.address]);
      expect(yield* safe.getThreshold()).toBe(1n);
      expect(yield* safe.nonce()).toBe(0n);
      expect(yield* safe.isModuleEnabled({ module: CANON.safe4337Module })).toBe(true);
      expect(yield* safe.isModuleEnabled({ module: CANON.multiSend })).toBe(false);

      const addOwner = yield* itemOf(Safe.abi, "addOwnerWithThreshold");
      const add = (owner: Address, threshold: bigint, nonce: bigint) => Effect.gen(function* () {
        const tx = calls(address, yield* Abi.encodeCall(addOwner, [owner, threshold]), nonce);
        const digest = yield* safe.getTransactionHash({ ...args(tx), _nonce: nonce });
        yield* mined(world.port, yield* safe.execTransaction({ ...args(tx), signatures: ownerSignature(low!.secret, digest) }, world.keys[1]!.signer));
      });
      yield* add(high!.key.address, 1n, 0n);
      expect(yield* safe.getOwners()).toStrictEqual([high!.key.address, low!.key.address]);
      expect(yield* safe.getThreshold()).toBe(1n);
      expect(yield* safe.nonce()).toBe(1n);
      yield* add(mid!.key.address, 2n, 1n);
      expect(yield* safe.getOwners()).toStrictEqual([mid!.key.address, high!.key.address, low!.key.address]);
      expect(yield* safe.getThreshold()).toBe(2n);
      expect(yield* safe.nonce()).toBe(2n);
    })));
});

describe("a SafeTx's digest is the Safe's getTransactionHash", () => {
  test.each([
    ["a payment at nonce 0", pays(RECIPIENT, 1000n, 0n)],
    ["a call with data at a later nonce", calls(RECIPIENT, "0xdeadbeef", 5n)],
    ["a delegatecall with every gas and refund field set", {
      to: "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359", value: 11n, data: "0xdeadbeef", operation: 1, safeTxGas: 5n, baseGas: 6n, gasPrice: 7n,
      gasToken: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", refundReceiver: "0x8fC4AF618430430a01522137f6d0b5930446c39B", nonce: 4n,
    } satisfies SafeTransaction],
    ["numbers past 2^53 in value, nonce and every gas field", {
      ...pays(RECIPIENT, 2n ** 200n + 3n, 2n ** 70n + 9n), safeTxGas: 2n ** 64n + 5n, baseGas: 2n ** 128n + 6n, gasPrice: 2n ** 255n + 7n,
    } satisfies SafeTransaction],
  ] as const)("for %s", (_name, tx) => withSafe((world) => Effect.gen(function* () {
    const onChain = yield* world.mods.Safe.at({ port: world.port, address: world.safe }).getTransactionHash({ ...args(tx), _nonce: tx.nonce });
    expect(SafeTx.digest(world.chainId, world.safe, tx)).toBe(onChain);
  })), 60_000);
});

describe("execTransaction sent by someone who is not an owner", () => {
  test("pays on the owner's signature over SafeTx.digest, and moves the nonce on by one", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const safe = world.mods.Safe.at({ port: world.port, address: world.safe });
      const tx = pays(RECIPIENT, 1000n, 0n);
      const signatures = ownerSignature(world.owner.secret, SafeTx.digest(world.chainId, world.safe, tx));
      const receipt = yield* mined(world.port, yield* safe.execTransaction({ ...args(tx), signatures }, world.keys[1]!.signer));
      expect(receipt.status).toBe("success");
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
      expect(yield* safe.nonce()).toBe(1n);
    })));

  test("a replayed SafeTx is refused GS026, typed, and nothing is sent", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const safe = world.mods.Safe.at({ port: world.port, address: world.safe });
      const stranger = world.keys[1]!;
      const tx = pays(RECIPIENT, 1000n, 0n);
      const exec = { ...args(tx), signatures: ownerSignature(world.owner.secret, yield* safe.getTransactionHash({ ...args(tx), _nonce: 0n })) };
      yield* mined(world.port, yield* safe.execTransaction(exec, stranger.signer));
      const sent = yield* txCount(world.rpcUrl, stranger.address);

      const refused = yield* safe.execTransaction(exec, stranger.signer).pipe(SafeRefusal.typed(world.safe), Effect.flip);
      expect(refused).toBeInstanceOf(SafeRefused);
      expect(refused).toStrictEqual(new SafeRefused({ code: "GS026", safe: world.safe }));
      expect(yield* txCount(world.rpcUrl, stranger.address)).toBe(sent);
      expect(yield* safe.nonce()).toBe(1n);
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
    })));

  test("a SafeTx signed by someone who is not an owner is refused GS026; no signatures at all, GS020", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const safe = world.mods.Safe.at({ port: world.port, address: world.safe });
      const intruder = yield* freshOwner;
      const tx = pays(RECIPIENT, 1000n, 0n);
      const forged = { ...args(tx), signatures: ownerSignature(intruder.secret, SafeTx.digest(world.chainId, world.safe, tx)) };
      expect(yield* safe.execTransaction(forged, world.keys[1]!.signer).pipe(SafeRefusal.typed(world.safe), Effect.flip))
        .toStrictEqual(new SafeRefused({ code: "GS026", safe: world.safe }));
      expect(yield* safe.execTransaction({ ...args(tx), signatures: "0x" }, world.keys[1]!.signer).pipe(SafeRefusal.typed(world.safe), Effect.flip))
        .toStrictEqual(new SafeRefused({ code: "GS020", safe: world.safe }));
    })));
});

describe("approveHash", () => {
  test("an owner approves a SafeTx's hash, then anyone executes it on that approval; an unapproved one is refused GS025", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const safe = world.mods.Safe.at({ port: world.port, address: world.safe });
      yield* setBalance(world.rpcUrl, world.owner.key.address, 10n ** 17n);
      const first = pays(RECIPIENT, 1000n, 0n);
      yield* mined(world.port, yield* safe.approveHash({ hashToApprove: SafeTx.digest(world.chainId, world.safe, first) }, world.owner.key.signer));

      const stranger = world.keys[1]!.signer;
      yield* mined(world.port, yield* safe.execTransaction({ ...args(first), signatures: approvedSignature(world.owner.key.address) }, stranger));
      expect(yield* safe.nonce()).toBe(1n);

      const unapproved = { ...args(pays(RECIPIENT, 1000n, 1n)), signatures: approvedSignature(world.owner.key.address) };
      expect(yield* safe.execTransaction(unapproved, stranger).pipe(SafeRefusal.typed(world.safe), Effect.flip))
        .toStrictEqual(new SafeRefused({ code: "GS025", safe: world.safe }));
      expect(yield* balanceOf(world.rpcUrl, RECIPIENT)).toBe(1000n);
    })));
});

describe("swapOwner", () => {
  test("through a SafeTx swaps the owner; naming the wrong previous owner is refused GS013; called directly, GS031", TIMEOUT, () =>
    withSafe((world) => Effect.gen(function* () {
      const safe = world.mods.Safe.at({ port: world.port, address: world.safe });
      const swapItem = yield* itemOf(world.mods.Safe.abi, "swapOwner");
      const stranger = world.keys[1]!.signer;
      const next = yield* freshOwner;
      const swap = calls(world.safe, yield* Abi.encodeCall(swapItem, [SENTINEL, world.owner.key.address, next.key.address]), 0n);
      const signed = { ...args(swap), signatures: ownerSignature(world.owner.secret, SafeTx.digest(world.chainId, world.safe, swap)) };
      yield* mined(world.port, yield* safe.execTransaction(signed, stranger));
      expect(yield* safe.getOwners()).toStrictEqual([next.key.address]);

      const wrong = calls(world.safe, yield* Abi.encodeCall(swapItem, [world.keys[2]!.address, next.key.address, RECIPIENT]), 1n);
      const refused = { ...args(wrong), signatures: ownerSignature(next.secret, SafeTx.digest(world.chainId, world.safe, wrong)) };
      expect(yield* safe.execTransaction(refused, stranger).pipe(SafeRefusal.typed(world.safe), Effect.flip))
        .toStrictEqual(new SafeRefused({ code: "GS013", safe: world.safe }));

      yield* setBalance(world.rpcUrl, next.key.address, 10n ** 17n);
      expect(yield* safe.swapOwner({ prevOwner: SENTINEL, oldOwner: next.key.address, newOwner: RECIPIENT }, next.key.signer)
        .pipe(SafeRefusal.typed(world.safe), Effect.flip))
        .toStrictEqual(new SafeRefused({ code: "GS031", safe: world.safe }));
      expect(yield* safe.getOwners()).toStrictEqual([next.key.address]);
    })));
});
