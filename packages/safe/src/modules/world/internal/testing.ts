// The checks' own helpers (✍️ author, #1161): an Anvil world, raw reads and an owner's signature, none from this package.
// A builder never edits this file or the tests that use it; ask the author.
import { secp256k1 } from "@noble/curves/secp256k1";
import { Clock, Duration, Effect, Option, Redacted, Stream } from "effect";
import { Timers } from "@orthograph/language-effect";
import { Anvil, type TestAccount } from "@orthograph/chain-evm";
import {
  Abi, Keys, makeChainPort,
  type AbiFunction, type Address, type ChainPort, type Hex, type Key, type TransactionReceipt,
} from "@orthograph/chain-evm/device";

export const timers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used by the Safe checks"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

// The canonical Safe 1.4.1 and 4337 module v0.3.0 deployment, written out here from the infrastructure citations in #1161 and
// @safe-global/safe-deployments 1.37.67 / @safe-global/safe-modules-deployments 3.0.14, never read from the package.
export const CANON = {
  proxyFactory: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  singleton: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
  moduleSetup: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
  safe4337Module: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
  multiSend: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
  multiSendCallOnly: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
  entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
} as const satisfies Record<string, Address>;

export const ZERO: Address = "0x0000000000000000000000000000000000000000";
export const SENTINEL: Address = "0x0000000000000000000000000000000000000001";

export const fn = (
  name: string,
  inputs: ReadonlyArray<readonly [string, string]>,
  outputs: ReadonlyArray<string> = [],
  stateMutability: "view" | "nonpayable" | "payable" = "nonpayable",
): AbiFunction => ({
  type: "function", name, stateMutability,
  inputs: inputs.map(([n, type]) => ({ name: n, type })),
  outputs: outputs.map((type) => ({ name: "", type })),
});

/** The Safe ABI items the checks encode with, written from Safe 1.4.1's source. */
export const ABI = {
  setup: fn("setup", [["_owners", "address[]"], ["_threshold", "uint256"], ["to", "address"], ["data", "bytes"],
    ["fallbackHandler", "address"], ["paymentToken", "address"], ["payment", "uint256"], ["paymentReceiver", "address"]]),
  enableModules: fn("enableModules", [["modules", "address[]"]]),
  createProxyWithNonce: fn("createProxyWithNonce", [["_singleton", "address"], ["initializer", "bytes"], ["saltNonce", "uint256"]], ["address"]),
  proxyCreationCode: fn("proxyCreationCode", [], ["bytes"], "view"),
  getOwners: fn("getOwners", [], ["address[]"], "view"),
  getThreshold: fn("getThreshold", [], ["uint256"], "view"),
  nonce: fn("nonce", [], ["uint256"], "view"),
  VERSION: fn("VERSION", [], ["string"], "view"),
  isModuleEnabled: fn("isModuleEnabled", [["module", "address"]], ["bool"], "view"),
  SUPPORTED_ENTRYPOINT: fn("SUPPORTED_ENTRYPOINT", [], ["address"], "view"),
  getTransactionHash: fn("getTransactionHash", [["to", "address"], ["value", "uint256"], ["data", "bytes"], ["operation", "uint8"],
    ["safeTxGas", "uint256"], ["baseGas", "uint256"], ["gasPrice", "uint256"], ["gasToken", "address"], ["refundReceiver", "address"],
    ["_nonce", "uint256"]], ["bytes32"], "view"),
  execTransaction: fn("execTransaction", [["to", "address"], ["value", "uint256"], ["data", "bytes"], ["operation", "uint8"],
    ["safeTxGas", "uint256"], ["baseGas", "uint256"], ["gasPrice", "uint256"], ["gasToken", "address"],
    ["refundReceiver", "address"], ["signatures", "bytes"]], ["bool"], "payable"),
  approveHash: fn("approveHash", [["hashToApprove", "bytes32"]]),
  swapOwner: fn("swapOwner", [["prevOwner", "address"], ["oldOwner", "address"], ["newOwner", "address"]]),
  addOwnerWithThreshold: fn("addOwnerWithThreshold", [["owner", "address"], ["_threshold", "uint256"]]),
} as const;

export const bytes = (hex: Hex): Uint8Array => Uint8Array.from(Buffer.from(hex.slice(2), "hex"));
export const hex = (data: Uint8Array): Hex => `0x${Buffer.from(data).toString("hex")}`;
export const keccak = (data: Hex): Hex => hex(Keys.keccak256(bytes(data)));
export const word = (value: bigint | Address): string => (typeof value === "bigint" ? value.toString(16) : value.slice(2)).padStart(64, "0");

/** The initializer as the implementation writes it (`infrastructure:P/organization-safe.ts:44-71`), encoded by the check itself. */
export const expectedInitializer = (owner: Address) =>
  Effect.gen(function* () {
    const enable = yield* Abi.encodeCall(ABI.enableModules, [[CANON.safe4337Module]]);
    return yield* Abi.encodeCall(ABI.setup, [[owner], 1n, CANON.moduleSetup, enable, CANON.safe4337Module, ZERO, 0n, ZERO]);
  });

export const rpc = <A>(rpcUrl: string, method: string, params: ReadonlyArray<unknown>) =>
  Effect.tryPromise({
    try: () => fetch(rpcUrl, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }).then((response) => response.json() as Promise<{ result?: A; error?: { message: string } }>),
    catch: () => new Error(`The check's ${method} failed`),
  }).pipe(Effect.flatMap((body) => body.error === undefined ? Effect.succeed(body.result as A) : Effect.fail(new Error(`${method}: ${body.error.message}`))));

export const codeAt = (rpcUrl: string, address: Address) => rpc<Hex>(rpcUrl, "eth_getCode", [address, "latest"]);
export const txCount = (rpcUrl: string, address: Address) => rpc<Hex>(rpcUrl, "eth_getTransactionCount", [address, "latest"]).pipe(Effect.map(BigInt));
export const balanceOf = (rpcUrl: string, address: Address) => rpc<Hex>(rpcUrl, "eth_getBalance", [address, "latest"]).pipe(Effect.map(BigInt));
export const setBalance = (rpcUrl: string, address: Address, wei: bigint) => rpc<null>(rpcUrl, "anvil_setBalance", [address, `0x${wei.toString(16)}`]);

/** A read of the check's own: `eth_call` of one ABI item, decoded by chain-evm's codec. */
export const read = (port: ChainPort, from: Address, to: Address, item: AbiFunction, args: ReadonlyArray<unknown> = []) =>
  Effect.gen(function* () {
    const data = yield* Abi.encodeCall(item, args);
    return yield* Abi.decodeResult(item, yield* port.read({ from, to, data }));
  });

/** One transaction sent by the check itself, mined, or a failure. */
export const sendTx = (port: ChainPort, key: Key, to: Address, data: Hex): Effect.Effect<TransactionReceipt, unknown> =>
  Effect.gen(function* () {
    const unsigned = yield* port.prepare({ from: key.address, to, data });
    yield* port.simulate(unsigned);
    const submission = yield* port.submit(yield* port.sign(unsigned, key.signer));
    const head = yield* port.track(submission, { depth: 1 }).pipe(Stream.runHead);
    if (Option.isNone(head) || head.value._tag !== "Included") return yield* Effect.fail(new Error("The check's transaction was not included"));
    return head.value.receipt;
  });

export interface World {
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly port: ChainPort;
  /** The world's funded keys: [0] deploys, [1] is a stranger to every Safe, [2] a spare. */
  readonly keys: ReadonlyArray<Key>;
  readonly accounts: ReadonlyArray<TestAccount>;
}

/** An Anvil of the test's own, a chain port on it and its funded keys. Nothing of the Safe is on it yet. */
export const withWorld = <A, E>(body: (world: World) => Effect.Effect<A, E, Timers>): Promise<A> =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const anvil = yield* Anvil.start({ accounts: 4 });
    const port = yield* makeChainPort({ chainId: anvil.chainId, rpcUrl: anvil.rpcUrl, pollIntervalMs: 25, receiptTimeoutMs: 5_000 });
    const keys = yield* Effect.forEach(anvil.accounts, (account) => Keys.fromSecret(account.privateKey));
    return yield* body({ rpcUrl: anvil.rpcUrl, chainId: anvil.chainId, port, keys, accounts: anvil.accounts });
  })).pipe(Effect.provideService(Timers, timers)));

/** A new owner with a key the check holds, not funded. */
export const freshOwner = Effect.gen(function* () {
  const secret = yield* Keys.generate;
  const key = yield* Keys.fromSecret(secret);
  return { key, secret };
});

/** Deploys a Safe through the factory with the check's own initializer; the address is the one the factory's `ProxyCreation` names. */
export const deploySafe = (world: World, owner: Address, saltNonce: bigint) =>
  Effect.gen(function* () {
    const initializer = yield* expectedInitializer(owner);
    const data = yield* Abi.encodeCall(ABI.createProxyWithNonce, [CANON.singleton, initializer, saltNonce]);
    const receipt = yield* sendTx(world.port, world.keys[0]!, CANON.proxyFactory, data);
    // ProxyCreation(address indexed proxy, address singleton)
    const topic = keccak(hex(Buffer.from("ProxyCreation(address,address)")));
    const log = receipt.logs.find((entry) => entry.address.toLowerCase() === CANON.proxyFactory.toLowerCase() && entry.topics[0] === topic);
    if (log === undefined || log.topics[1] === undefined) return yield* Effect.fail(new Error("The factory emitted no ProxyCreation"));
    return Keys.checksum(`0x${log.topics[1].slice(26)}`);
  });

/** An owner's ECDSA signature of a SafeTx digest, in Safe's packing: r, s, v (27 or 28). */
export const ownerSignature = (secret: Redacted.Redacted<Hex>, digest: Hex): Hex => {
  const signature = secp256k1.sign(bytes(digest), bytes(Redacted.value(secret)));
  return `0x${word(signature.r)}${word(signature.s)}${(27 + signature.recovery).toString(16)}`;
};

/** A pre-validated signature: r is the owner, s is 0, v is 1 (the owner sent it, or approved the hash). */
export const approvedSignature = (owner: Address): Hex => `0x${word(owner)}${word(0n)}01`;
