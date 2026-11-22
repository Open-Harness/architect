// Ask #471, the checks (empty handler until the build): `ChainPort.read`, a plain `eth_call` at latest that returns its data, on Anvil.
// A revert maps exactly as `simulate`'s does (tx/internal/simulate.ts). Gated as the other Anvil proofs: ORTHO_CHAIN_EVM_ANVIL=1.
import { Clock, Duration, Effect, Redacted } from "effect";
import { Timers } from "@orthograph/language-effect";
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseAbi, toFunctionSelector, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { expect, test } from "vitest";
import { Anvil } from "../anvil/service.ts";
import type { RefusalLockEntry } from "../faults/types.ts";
import { makeChainPort } from "./service.ts";
// Compiled from internal/anvil-token.sol with solcjs 0.8.30 --optimize --bin.
const tokenBytecode = "0x6080604052348015600e575f5ffd5b50335f8181526020818152604080832060649081905590519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a361023f806100615f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c806370a0823114610043578063a9059cbb14610075578063ad50950314610098575b5f5ffd5b610062610051366004610187565b5f6020819052908152604090205481565b6040519081526020015b60405180910390f35b6100886100833660046101a7565b6100a1565b604051901515815260200161006c565b61009f5f5ffd5b005b335f90815260208190526040812054828110156100df5760405163cf47918160e01b8152600481018290526024810184905260440160405180910390fd5b6100e983826101e3565b335f90815260208190526040808220929092556001600160a01b0386168152908120805485929061011b9084906101f6565b90915550506040518381526001600160a01b0385169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a360019150505b92915050565b80356001600160a01b0381168114610182575f5ffd5b919050565b5f60208284031215610197575f5ffd5b6101a08261016c565b9392505050565b5f5f604083850312156101b8575f5ffd5b6101c18361016c565b946020939093013593505050565b634e487b7160e01b5f52601160045260245ffd5b81810381811115610166576101666101cf565b80820180821115610166576101666101cf56fea264697066735822122058493ecce12a37a55d5e8d6f308cd1c95de936a4216d2f8ea1b8fd249107090364736f6c634300081e0033" as const;

const abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function refuseEmpty() pure",
  "error InsufficientBalance(uint256 available, uint256 requested)",
]);
const signature = "InsufficientBalance(uint256,uint256)";
const refusal: RefusalLockEntry = {
  code: "TOKEN-001", name: "InsufficientBalance", selector: toFunctionSelector(signature), signature, abi: abi[3],
};
const word = (n: bigint) => `0x${n.toString(16).padStart(64, "0")}` as Hex;

const timers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used in the read proof"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

/** A fresh Anvil with the ERC20 fixture deployed by account 0, which holds all 100 of it; account 1 holds none. */
const onToken = <A, E>(body: (world: {
  readonly rpcUrl: string; readonly chainId: number; readonly token: Address;
  readonly holder: Address; readonly other: Address; readonly head: () => Promise<bigint>; readonly nonce: (a: Address) => Promise<number>;
}) => Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.gen(function* () {
    const chain = yield* Anvil.start({ chainId: 31_471, accounts: 2 });
    const [holder, other] = chain.accounts;
    if (holder === undefined || other === undefined) return yield* Effect.die("Anvil made no accounts");
    const viemChain = { ...foundry, id: chain.chainId };
    const transport = http(chain.rpcUrl, { retryCount: 0, timeout: 5_000 });
    const client = createPublicClient({ chain: viemChain, transport, pollingInterval: 25 });
    const wallet = createWalletClient({ chain: viemChain, transport, account: privateKeyToAccount(Redacted.value(holder.privateKey)) });
    const receipt = yield* Effect.tryPromise(async () =>
      client.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi, bytecode: tokenBytecode }) }));
    const token = receipt.contractAddress;
    if (token === null || token === undefined) return yield* Effect.die("The ERC20 fixture did not deploy");
    return yield* body({
      rpcUrl: chain.rpcUrl, chainId: chain.chainId, token, holder: holder.address, other: other.address,
      head: () => client.getBlockNumber({ cacheTime: 0 }),
      nonce: (address) => client.getTransactionCount({ address, blockTag: "pending" }),
    });
  }).pipe(Effect.scoped, Effect.provideService(Timers, timers)));

const anvil = test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1");

anvil("read returns a view function's data, and 0x from an account with no code", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const balance = (owner: Address) => ({
      from: world.other, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [owner] }),
    });
    expect(yield* port.read(balance(world.holder))).toBe(word(100n));
    expect(yield* port.read(balance(world.other))).toBe(word(0n));
    expect(yield* port.read({ from: world.other, to: world.holder, data: "0x" })).toBe("0x");
  }).pipe(Effect.provideService(Timers, timers))));

anvil("read sends nothing and reserves no nonce: the head, the sender's nonce and the state are as they were", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const [head, nonce] = [yield* Effect.promise(world.head), yield* Effect.promise(() => world.nonce(world.holder))];
    const transfer = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "transfer", args: [world.other, 1n] }) };
    // A write function's call answers what it would return, and changes nothing.
    expect(yield* port.read(transfer)).toBe(word(1n));
    expect(yield* port.read(transfer)).toBe(word(1n));
    expect(yield* Effect.promise(world.head)).toBe(head);
    expect(yield* Effect.promise(() => world.nonce(world.holder))).toBe(nonce);
    const balance = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [world.holder] }) };
    expect(yield* port.read(balance)).toBe(word(100n));
    // The next prepared transaction takes the very nonce the reads left free.
    expect((yield* port.prepare(transfer)).transaction.nonce).toBe(nonce);
  }).pipe(Effect.provideService(Timers, timers))));

anvil("read runs as the call's sender: the same transfer reverts with a different balance for another account", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const data = encodeFunctionData({ abi, functionName: "transfer", args: [world.other, 101n] });
    expect(yield* port.read({ from: world.holder, to: world.token, data }).pipe(Effect.flip)).toMatchObject({
      _tag: "ChainRefusal", args: { available: 100n, requested: 101n },
    });
    expect(yield* port.read({ from: world.other, to: world.token, data }).pipe(Effect.flip)).toMatchObject({
      _tag: "ChainRefusal", args: { available: 0n, requested: 101n },
    });
  }).pipe(Effect.provideService(Timers, timers))));

anvil("a reverting read is mapped exactly as simulate maps it: a locked error is its typed refusal, with the program", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const call = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "transfer", args: [world.other, 101n] }) };
    const expected = {
      _tag: "ChainRefusal", code: "TOKEN-001", name: "InsufficientBalance", selector: "0xcf479181", program: world.token,
      args: { available: 100n, requested: 101n },
    };
    const simulated = yield* port.simulate(yield* port.prepare({ ...call, gas: 100_000n })).pipe(Effect.flip);
    expect(simulated).toMatchObject(expected);
    const read = yield* port.read(call).pipe(Effect.flip);
    expect(read).toMatchObject(expected);
    expect(read).toBeInstanceOf(Error);
  }).pipe(Effect.provideService(Timers, timers))));

anvil("an empty revert, and a revert with no lock entry, are a ChainFault of kind revert, as simulate's are", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const locked = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const unlocked = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl });
    const empty = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "refuseEmpty" }) };
    expect(yield* locked.read(empty).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "revert", program: world.token });
    const transfer = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "transfer", args: [world.other, 101n] }) };
    const raw = `${refusal.selector}${word(100n).slice(2)}${word(101n).slice(2)}`;
    const simulated = yield* unlocked.simulate(yield* unlocked.prepare({ ...transfer, gas: 100_000n })).pipe(Effect.flip);
    expect(simulated).toMatchObject({ _tag: "ChainFault", kind: "revert", program: world.token, raw });
    expect(yield* unlocked.read(transfer).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "revert", program: world.token, raw });
  }).pipe(Effect.provideService(Timers, timers))));
