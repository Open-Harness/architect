// The erc20 checks' world: a real Anvil of the test's scope (`Anvil.start`, the world's own), three funded keys, a chain
// port, and the checks' own reads of the chain (chain-evm's ABI codec over `ChainPort.read`, and plain JSON-RPC), so no
// expected value comes from the adapter. Written by the checks author (#1162). Not built into the package (tsconfig.build.json).
import { Clock, Duration, Effect, Option, Redacted, Stream, type Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import {
  Abi, Anvil, ChainFault, Keys, makeChainPort, makeEventSource,
  type AbiError, type AbiEvent, type AbiFunction, type Address, type ChainPort, type Hex, type Key, type RefusalLockEntry, type Submission,
} from "@orthograph/chain-evm";

/** Anvil is a process of its own, so the world's timers run on real time, as chain-evm's Anvil checks do. */
export const liveTimers = Timers.of({
  at: () => Effect.die("only Timers.sleep is used in the erc20 Anvil checks"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

export const anvilOn = process.env["ORTHO_CHAIN_EVM_ANVIL"] === "1";

const address = (name: string) => ({ name, type: "address" }) as const;
const uint = (name: string, type = "uint256") => ({ name, type }) as const;

/** The ERC-20 standard's items and OpenZeppelin 5's ERC-6093 errors, written out by the checks, as the checks read them. */
export const standard = {
  balanceOf: { type: "function", name: "balanceOf", stateMutability: "view", inputs: [address("account")], outputs: [uint("")] },
  decimals: { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [uint("", "uint8")] },
  totalSupply: { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [uint("")] },
  transfer: { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [address("to"), uint("value")], outputs: [{ name: "", type: "bool" }] },
  Transfer: { type: "event", name: "Transfer", inputs: [
    { ...address("from"), indexed: true }, { ...address("to"), indexed: true }, { ...uint("value"), indexed: false },
  ] },
  ERC20InsufficientBalance: { type: "error", name: "ERC20InsufficientBalance", inputs: [address("sender"), uint("balance"), uint("needed")] },
  ERC20InvalidReceiver: { type: "error", name: "ERC20InvalidReceiver", inputs: [address("receiver")] },
} as const satisfies Record<string, AbiFunction | AbiEvent | AbiError>;

/** The first four bytes of the keccak-256 of a signature, worked out here rather than taken from any codec. */
export const selector = (signature: string): Hex =>
  `0x${Buffer.from(Keys.keccak256(new TextEncoder().encode(signature))).toString("hex").slice(0, 8)}`;

export interface World {
  readonly alice: Key;
  readonly bob: Key;
  readonly carol: Key;
  /** A chain port with the given refusals, as a world makes one from its refusals.lock. */
  readonly port: (refusals?: ReadonlyArray<RefusalLockEntry>) => Effect.Effect<ChainPort, ChainFault>;
  /** One view function's answer, read by the check itself (`eth_call` through a plain port, decoded by chain-evm's codec). */
  readonly call: (to: Address, fn: AbiFunction, args: ReadonlyArray<unknown>, from?: Address) => Effect.Effect<ReadonlyArray<unknown>, unknown>;
  /** The bytes a reverting call answers; a call that does not revert fails. */
  readonly revertOf: (from: Address, to: Address, fn: AbiFunction, args: ReadonlyArray<unknown>) => Effect.Effect<Hex, unknown>;
  /** The Transfer logs a token emitted from `fromBlock` on, decoded by the check's own event source. */
  readonly transfers: (token: Address, fromBlock: bigint) => Effect.Effect<ReadonlyArray<unknown>, unknown>;
  readonly nonce: (account: Address) => Effect.Effect<number, Error>;
  readonly head: Effect.Effect<bigint, Error>;
}

const rpcOf = (url: string) => (method: string, params: ReadonlyArray<unknown>) =>
  Effect.tryPromise({
    try: () => fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }).then((response) => response.json() as Promise<{ readonly result?: unknown }>),
    catch: () => new Error(`the check's own ${method} to Anvil failed`),
  }).pipe(Effect.map((body) => body.result));

export const world: Effect.Effect<World, unknown, Scope.Scope> = Effect.gen(function* () {
  const anvil = yield* Anvil.start({ accounts: 3 }).pipe(Effect.provideService(Timers, liveTimers));
  const keys = yield* Effect.forEach(anvil.accounts, (account) => Keys.fromSecret(Redacted.make(Redacted.value(account.privateKey))));
  const [alice, bob, carol] = keys;
  if (alice === undefined || bob === undefined || carol === undefined) return yield* Effect.die("the world made fewer than three keys");
  const port = (refusals: ReadonlyArray<RefusalLockEntry> = []) => makeChainPort({
    chainId: anvil.chainId, rpcUrl: anvil.rpcUrl, pollIntervalMs: 25, receiptTimeoutMs: 10_000, refusals,
  }).pipe(Effect.provideService(Timers, liveTimers));
  const plain = yield* port();
  const rpc = rpcOf(anvil.rpcUrl);
  return {
    alice, bob, carol, port,
    call: (to, fn, args, from = alice.address) => Effect.gen(function* () {
      const data = yield* Abi.encodeCall(fn, args);
      return yield* Abi.decodeResult(fn, yield* plain.read({ from, to, data }));
    }),
    revertOf: (from, to, fn, args) => Effect.gen(function* () {
      const data = yield* Abi.encodeCall(fn, args);
      const failure = yield* Effect.flip(plain.read({ from, to, data }));
      if (failure._tag !== "ChainFault" || failure.raw === undefined) return yield* Effect.fail(new Error("the call did not revert with data"));
      return failure.raw;
    }),
    transfers: (token, fromBlock) => Effect.gen(function* () {
      const polled = yield* plain.follow(makeEventSource(standard.Transfer, token, fromBlock), { depth: 1 }).poll();
      return polled.changes.filter((change) => change._tag === "Confirmed").map((change) => change.event.args);
    }),
    nonce: (account) => rpc("eth_getTransactionCount", [account, "pending"]).pipe(Effect.map((n) => Number(n))),
    head: rpc("eth_blockNumber", []).pipe(Effect.map((n) => BigInt(n as string))),
  };
});

/** Run one check in a fresh world; the world's Anvil is stopped when it ends. */
export const inWorld = <A, E>(body: (w: World) => Effect.Effect<A, E, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(Effect.flatMap(world, body)));

/** The receipt of a submission once it is in a block, read through the port's own tracker. */
export const mined = (port: ChainPort, submission: Submission) =>
  Effect.gen(function* () {
    const first = yield* Stream.runHead(port.track(submission, { depth: 1 }));
    if (Option.isNone(first) || first.value._tag !== "Included") return yield* Effect.die("the submission was not included");
    return first.value.receipt;
  });

/** Deploy bytes through the chain port alone, never through the adapter: the address the receipt names. */
export const deployBytecode = (port: ChainPort, key: Key, data: Hex) =>
  Effect.gen(function* () {
    const unsigned = yield* port.prepare({ from: key.address, data });
    yield* port.simulate(unsigned);
    const receipt = yield* mined(port, yield* port.submit(yield* port.sign(unsigned, key.signer)));
    if (receipt.contractAddress === null || receipt.contractAddress === undefined) return yield* Effect.die("the deployment made no contract");
    return receipt.contractAddress;
  });

/**
 * Not the test token, and not OpenZeppelin's: chain-evm's own Anvil fixture token (`chain-evm/src/modules/tx/internal/anvil-token.sol`,
 * the same bytes as `tx/anvil.test.ts`). It holds 100 for its deployer, has no `decimals()`, and refuses with its own
 * `InsufficientBalance(uint256,uint256)`, a selector ERC-6093 does not have. It shows the adapter reads any ERC-20 and decodes
 * only the errors it knows.
 */
export const foreignTokenBytecode: Hex = "0x6080604052348015600e575f5ffd5b50335f8181526020818152604080832060649081905590519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a361023f806100615f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c806370a0823114610043578063a9059cbb14610075578063ad50950314610098575b5f5ffd5b610062610051366004610187565b5f6020819052908152604090205481565b6040519081526020015b60405180910390f35b6100886100833660046101a7565b6100a1565b604051901515815260200161006c565b61009f5f5ffd5b005b335f90815260208190526040812054828110156100df5760405163cf47918160e01b8152600481018290526024810184905260440160405180910390fd5b6100e983826101e3565b335f90815260208190526040808220929092556001600160a01b0386168152908120805485929061011b9084906101f6565b90915550506040518381526001600160a01b0385169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a360019150505b92915050565b80356001600160a01b0381168114610182575f5ffd5b919050565b5f60208284031215610197575f5ffd5b6101a08261016c565b9392505050565b5f5f604083850312156101b8575f5ffd5b6101c18361016c565b946020939093013593505050565b634e487b7160e01b5f52601160045260245ffd5b81810381811115610166576101666101cf565b80820180821115610166576101666101cf56fea264697066735822122058493ecce12a37a55d5e8d6f308cd1c95de936a4216d2f8ea1b8fd249107090364736f6c634300081e0033";
