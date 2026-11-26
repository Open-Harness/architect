// Test-only (#1163's checks): an Anvil world with Zodiac installed, a Safe 1.4.1 owned by one key, a test token the Safe
// holds, and a Roles modifier for the Safe with a budget on it. Everything goes through chain-evm: its Anvil, its port
// (prepare, simulate, sign, submit, track), its `Abi` and its `Keys`. Never shipped (tsconfig.build.json excludes this folder).
import { Clock, Duration, Effect, Stream, type Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import { Anvil, type TestAccount } from "@orthograph/chain-evm";
import {
  Abi, Keys, makeChainPort, type AbiFunction, type Address, type ChainError, type Hex, type Key, type TransactionReceipt,
} from "@orthograph/chain-evm/device";
import { Roles } from "../../service.ts";
import type { ContractCall, OrgBudget } from "../../types.ts";
import { ZodiacWorld } from "../../../world/service.ts";
import { paymentsStandInBytecode, safeL2Bytecode, safeProxyFactoryBytecode, tokenBytecode } from "./bytecode.ts";
import { addressWord, decodeArgs, encode, fn, hex, jsonRpc, keccak, selector, utf8, word } from "./evm.ts";

export const anvilGate = process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1";
export const zeroAddress: Address = "0x0000000000000000000000000000000000000000";

export const timers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used in the zodiac-roles checks"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

/** Run one check's world: a scope of its own (Anvil stops when it closes) and the live clock behind `Timers`. */
export const run = <A, E>(effect: Effect.Effect<A, E, Scope.Scope | Timers>) =>
  Effect.runPromise(effect.pipe(Effect.scoped, Effect.provideService(Timers, timers)));

export const token = {
  balanceOf: fn("balanceOf", [["address"]], [["uint256"]], "view"),
  transfer: fn("transfer", [["address", "to"], ["uint256", "value"]], [["bool"]]),
  refuseEmpty: fn("refuseEmpty", [], [], "pure"),
};
export const safeAbi = {
  setup: fn("setup", [["address[]"], ["uint256"], ["address"], ["bytes"], ["address"], ["address"], ["uint256"], ["address"]]),
  execTransaction: fn("execTransaction", [
    ["address"], ["uint256"], ["bytes"], ["uint8"], ["uint256"], ["uint256"], ["uint256"], ["address"], ["address"], ["bytes"],
  ], [["bool"]], "payable"),
  enableModule: fn("enableModule", [["address"]]),
  isModuleEnabled: fn("isModuleEnabled", [["address"]], [["bool"]], "view"),
};
const createProxyWithNonce = fn("createProxyWithNonce", [["address"], ["bytes"], ["uint256"]], [["address"]]);
/** The stand-in's send((bytes32 settlementId, address recipient, address token, uint256 amount) item). */
export const paymentsAbi = {
  send: fn("send", [["tuple", "item", [
    { type: "bytes32", name: "settlementId" }, { type: "address", name: "recipient" }, { type: "address", name: "token" }, { type: "uint256", name: "amount" },
  ]]]),
};
export const modifierAbi = {
  owner: fn("owner", [], [["address"]], "view"),
  avatar: fn("avatar", [], [["address"]], "view"),
  target: fn("target", [], [["address"]], "view"),
};
export const topicOf = (signature: string) => keccak(utf8(signature));
// Safe 1.4.1 does not revert when its inner call fails: it emits ExecutionFailure(bytes32,uint256).
const executionFailure = topicOf("ExecutionFailure(bytes32,uint256)");

export const world = Effect.gen(function* () {
  const anvil = yield* Anvil.start({ accounts: 4 });
  const rpc = jsonRpc(anvil.rpcUrl);
  const keyOf = (account: TestAccount) => Keys.fromSecret(account.privateKey);
  const [owner, member, stranger, deployer] = yield* Effect.forEach(anvil.accounts, keyOf) as Effect.Effect<[Key, Key, Key, Key], never>;
  const port = yield* makeChainPort({
    chainId: anvil.chainId, rpcUrl: anvil.rpcUrl, pollIntervalMs: 20, receiptTimeoutMs: 5_000, refusals: Roles.refusals,
  });
  /** A transaction sent the port's way, followed into a block. */
  const send = (who: Key, call: { readonly to?: Address; readonly data: Hex; readonly value?: bigint }) => Effect.gen(function* () {
    const prepared = yield* port.prepare({ from: who.address, data: call.data, ...(call.to === undefined ? {} : { to: call.to }), ...(call.value === undefined ? {} : { value: call.value }) });
    yield* port.simulate(prepared);
    const submission = yield* port.submit(yield* port.sign(prepared, who.signer));
    const state = yield* port.track(submission, { depth: 1 }).pipe(Stream.runHead);
    if (state._tag === "None" || state.value._tag !== "Included") return yield* Effect.fail(new Error("A transaction was not included"));
    return state.value.receipt;
  });
  const deploy = (who: Key, bytecode: Hex) => send(who, { data: bytecode }).pipe(Effect.flatMap((receipt) =>
    receipt.contractAddress ? Effect.succeed(receipt.contractAddress) : Effect.fail(new Error("A fixture contract did not deploy"))));
  const read = (to: Address, item: AbiFunction, args: ReadonlyArray<unknown> = []) =>
    encode(item, args).pipe(Effect.flatMap((data) => port.read({ from: zeroAddress, to, data })), Effect.flatMap((data) => Abi.decodeResult(item, data)));
  const now = rpc("eth_getBlockByNumber", ["latest", false]).pipe(Effect.map((block) => BigInt((block as { readonly timestamp: Hex }).timestamp)));
  const nonceOf = (address: Address) => rpc("eth_getTransactionCount", [address, "pending"]).pipe(Effect.map((count) => BigInt(count as Hex)));
  const codeOf = (address: Address) => rpc("eth_getCode", [address, "latest"]).pipe(Effect.map((code) => code as Hex));
  const blockTime = (number: bigint) => rpc("eth_getBlockByNumber", [`0x${number.toString(16)}`, false]).pipe(Effect.map((block) => BigInt((block as { readonly timestamp: Hex }).timestamp)));
  const later = (seconds: number) => rpc("evm_increaseTime", [seconds]).pipe(Effect.andThen(rpc("evm_mine")));
  const fund = (address: Address, wei: bigint) => rpc("anvil_setBalance", [address, `0x${wei.toString(16)}`]);
  return { anvil, rpc, port, owner, member, stranger, deployer, send, deploy, read, now, blockTime, nonceOf, codeOf, later, fund };
});
export type World = Effect.Success<typeof world>;

/** A Safe 1.4.1 owned by `owner` alone, threshold 1. */
export const safeOf = (w: World, owner: Key) => Effect.gen(function* () {
  const singleton = yield* w.deploy(w.deployer, safeL2Bytecode);
  const factory = yield* w.deploy(w.deployer, safeProxyFactoryBytecode);
  const initializer = yield* encode(safeAbi.setup, [[owner.address], 1n, zeroAddress, "0x", zeroAddress, zeroAddress, 0n, zeroAddress]);
  const receipt = yield* w.send(w.deployer, { to: factory, data: yield* encode(createProxyWithNonce, [singleton, initializer, 0n]) });
  const created = receipt.logs.find((log) => log.address.toLowerCase() === factory.toLowerCase() && log.topics[0] === topicOf("ProxyCreation(address,address)"));
  const proxy = created?.topics[1];
  return proxy ? Keys.checksum(`0x${proxy.slice(26)}`) : yield* Effect.fail(new Error("The Safe proxy was not created"));
});

/** The Safe makes `call`, signed by its one owner, who sends it (Safe's pre-validated signature: r = owner, s = 0, v = 1). */
export const bySafe = (w: World, safe: Address, owner: Key, call: ContractCall) => Effect.gen(function* () {
  const signature = hex(addressWord(owner.address), word(0n), "01");
  const data = yield* encode(safeAbi.execTransaction, [call.to, call.value, call.data, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, signature]);
  const receipt: TransactionReceipt = yield* w.send(owner, { to: safe, data });
  if (receipt.logs.some((log) => log.topics[0] === executionFailure)) return yield* Effect.fail(new Error("The Safe's inner call failed"));
  return receipt;
});

/**
 * The world with a budget on it: Zodiac installed; the Safe holding one test token's 100 units; a payments stand-in
 * holding another token's 100; the Safe's modifier deployed and enabled; and the budget's calls made by the Safe, in order.
 */
export const budgetWorld = (budgetFor: (ctx: {
  readonly token: Address; readonly member: Address; readonly payments: Address; readonly paymentsToken: Address;
}) => OrgBudget) => Effect.gen(function* () {
  const w = yield* world;
  yield* ZodiacWorld.install(w.anvil.rpcUrl);
  const safe = yield* safeOf(w, w.owner);
  const tokenAddress = yield* w.deploy(w.deployer, tokenBytecode);
  const paymentsToken = yield* w.deploy(w.deployer, tokenBytecode);
  const payments = yield* w.deploy(w.deployer, paymentsStandInBytecode);
  const transfer = (to: Address, amount: bigint) => encode(token.transfer, [to, amount]);
  yield* w.send(w.deployer, { to: tokenAddress, data: yield* transfer(safe, 100n) });
  yield* w.send(w.deployer, { to: paymentsToken, data: yield* transfer(payments, 100n) });
  const deployment = yield* Roles.deploy({ safe, saltNonce: 1n });
  const deployed = yield* w.send(w.deployer, deployment.call);
  const modifier = deployment.address;
  yield* bySafe(w, safe, w.owner, { to: safe, value: 0n, data: yield* encode(safeAbi.enableModule, [modifier]) });
  const budget = budgetFor({ token: tokenAddress, member: w.member.address, payments, paymentsToken });
  const setAllowance = selector("setAllowance(bytes32,uint128,uint128,uint128,uint64,uint64)");
  const allowanceSetAt: Array<bigint> = [];
  for (const call of yield* Roles.budgetCalls(modifier, budget)) {
    const receipt = yield* bySafe(w, safe, w.owner, call);
    if (call.data.slice(0, 10) === setAllowance) allowanceSetAt.push(yield* w.blockTime(receipt.blockNumber));
  }
  const balanceOf = (who: Address, of: Address = tokenAddress) => w.read(of, token.balanceOf, [who]).pipe(Effect.map(([balance]) => balance as bigint));
  return { ...w, safe, token: tokenAddress, payments, paymentsToken, modifier, budget, deployed, transfer, balanceOf, allowanceSetAt };
});
export type BudgetWorld = Effect.Success<ReturnType<typeof budgetWorld>>;

/** A call as far as the port's simulation: the refusal if it is refused, `undefined` if it would pass. Nothing is signed or sent. */
export const attempt = (w: World, from: Address, call: ContractCall) => Effect.gen(function* () {
  const prepared = yield* w.port.prepare({ from, to: call.to, data: call.data, value: call.value }).pipe(Effect.result);
  if (prepared._tag === "Failure") return prepared.failure as ChainError | undefined;
  const simulated = yield* w.port.simulate(prepared.success).pipe(Effect.result);
  yield* w.port.release(prepared.success);
  return simulated._tag === "Failure" ? simulated.failure : undefined;
});

export { decodeArgs };
