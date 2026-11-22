// Ask #471, the checks (empty handler until the build): `ChainPort.read`, a plain `eth_call` at latest that returns its data, on Anvil.
// A revert maps exactly as `simulate`'s does (tx/internal/simulate.ts). Gated as the other Anvil proofs: ORTHO_CHAIN_EVM_ANVIL=1.
import { connect, createServer, type Server, type Socket } from "node:net";
import { Clock, Duration, Effect, Redacted, type Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import {
  createPublicClient, createTestClient, createWalletClient, encodeFunctionData, http, parseAbi, toFunctionSelector, zeroAddress,
  type Address, type Hex,
} from "viem";
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

/**
 * A probe contract written in EVM assembly (no compiler): it reverts unless `msg.value` is 7 wei, then burns about 52,000 gas in a loop
 * and returns the word 1. So a call that drops its `value` reverts, and a call that drops its `gas` limit runs to the end.
 *   34 6007 14 600b 57 6000 80 fd | 5b 6107d0 | 5b 6001 90 03 80 600f 57 | 50 6001 6000 52 6020 6000 f3
 * (CALLVALUE, PUSH 7, EQ, JUMPI to the loop, else REVERT; the loop counts 2000 down; MSTORE 1, RETURN 32 bytes)
 */
const probeRuntime = "34600714600b57600080fd5b6107d05b600190038060" + "0f57506001600052602060" + "00f3";
const probeInit = `0x602380600b6000396000f3${probeRuntime}`;

/** A TCP stand-in in front of Anvil, so the world can stall or lose its RPC after the port is built, with the real Anvil behind it. */
const withProxy = (upstream: string) => Effect.acquireRelease(
  Effect.callback<{ readonly url: string; readonly server: Server; readonly sockets: Set<Socket>; readonly state: { stalled: boolean } }, Error>((resume) => {
    const sockets = new Set<Socket>();
    const state = { stalled: false };
    const port = Number(new URL(upstream).port);
    const track = (socket: Socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.on("error", () => socket.destroy()); };
    const server = createServer((client) => {
      track(client);
      // A stalled proxy takes the request on any connection, new or kept alive, and never answers it.
      const out = connect(port, "127.0.0.1");
      track(out);
      out.on("close", () => client.destroy());
      client.on("close", () => out.destroy());
      client.on("data", (chunk) => { if (!state.stalled) out.write(chunk); });
      out.on("data", (chunk) => { if (!state.stalled) client.write(chunk); });
    });
    server.once("error", (error) => resume(Effect.fail(error)));
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address !== null && typeof address === "object") resume(Effect.succeed({ url: `http://127.0.0.1:${address.port}`, server, sockets, state }));
    });
  }),
  (proxy) => Effect.sync(() => { for (const socket of proxy.sockets) socket.destroy(); proxy.server.close(); }),
);
const stall = (proxy: { readonly sockets: Set<Socket>; readonly state: { stalled: boolean } }) =>
  Effect.sync(() => { proxy.state.stalled = true; });
const lose = (proxy: { readonly server: Server; readonly sockets: Set<Socket> }) =>
  Effect.sync(() => { proxy.server.close(); for (const socket of proxy.sockets) socket.destroy(); });

interface World {
  readonly rpcUrl: string; readonly chainId: number; readonly token: Address;
  readonly holder: Address; readonly other: Address;
  readonly head: () => Promise<bigint>; readonly nonce: (a: Address) => Promise<number>;
  readonly transfer: (to: Address, value: bigint) => Promise<Hex>;
  readonly settle: (hash: Hex) => Promise<void>;
  readonly test: { readonly automine: (on: boolean) => Promise<void>; readonly mine: () => Promise<void> };
  readonly deployProbe: () => Promise<Address>;
}

/** A fresh Anvil with the ERC20 fixture deployed by account 0, which holds all 100 of it; account 1 holds none. */
const onToken = <A, E>(body: (world: World) => Effect.Effect<A, E, Scope.Scope>) =>
  Effect.runPromise(Effect.gen(function* () {
    const chain = yield* Anvil.start({ chainId: 31_471, accounts: 2 });
    const [holder, other] = chain.accounts;
    if (holder === undefined || other === undefined) return yield* Effect.die("Anvil made no accounts");
    const viemChain = { ...foundry, id: chain.chainId };
    const transport = http(chain.rpcUrl, { retryCount: 0, timeout: 5_000 });
    const client = createPublicClient({ chain: viemChain, transport, pollingInterval: 25 });
    const wallet = createWalletClient({ chain: viemChain, transport, account: privateKeyToAccount(Redacted.value(holder.privateKey)) });
    const testClient = createTestClient({ chain: viemChain, transport, mode: "anvil" });
    const receipt = yield* Effect.tryPromise(async () =>
      client.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi, bytecode: tokenBytecode }) }));
    const token = receipt.contractAddress;
    if (token === null || token === undefined) return yield* Effect.die("The ERC20 fixture did not deploy");
    return yield* body({
      rpcUrl: chain.rpcUrl, chainId: chain.chainId, token, holder: holder.address, other: other.address,
      head: () => client.getBlockNumber({ cacheTime: 0 }),
      nonce: (address) => client.getTransactionCount({ address, blockTag: "pending" }),
      transfer: (to, value) => wallet.writeContract({ address: token, abi, functionName: "transfer", args: [to, value] }),
      settle: async (hash) => { await client.waitForTransactionReceipt({ hash }); },
      test: {
        automine: (on) => testClient.setAutomine(on),
        mine: () => testClient.mine({ blocks: 1 }),
      },
      deployProbe: async () => {
        const mined = await client.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ data: probeInit as Hex }) });
        return mined.contractAddress ?? Promise.reject(new Error("The probe did not deploy"));
      },
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

anvil("read sees the latest block: a state change made since is there, and a transaction still pending is not", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const balance = { from: world.other, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [world.other] }) };
    expect(yield* port.read(balance)).toBe(word(0n));
    // A transfer mined in a later block than the deployment: a read pinned to an old block does not see it.
    yield* Effect.promise(async () => world.settle(await world.transfer(world.other, 7n)));
    expect(yield* port.read(balance)).toBe(word(7n));
    // With automine off a second transfer waits in the pool: latest still says 7, pending would say 12.
    yield* Effect.promise(() => world.test.automine(false));
    const waiting = yield* Effect.promise(() => world.transfer(world.other, 5n));
    expect(yield* port.read(balance)).toBe(word(7n));
    yield* Effect.promise(() => world.test.mine());
    yield* Effect.promise(() => world.settle(waiting));
    expect(yield* port.read(balance)).toBe(word(12n));
  }).pipe(Effect.provideService(Timers, timers))));

anvil("read carries the call's value and gas: a payable probe wants 7 wei, and a gas limit too low to finish fails as simulate's does", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const probe = yield* Effect.promise(world.deployProbe);
    const call = { from: world.other, to: probe };
    expect(yield* port.read({ ...call, value: 7n })).toBe(word(1n));
    expect(yield* port.read(call).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "revert", program: probe });
    expect(yield* port.read({ ...call, value: 8n }).pipe(Effect.flip)).toMatchObject({ _tag: "ChainFault", kind: "revert" });
    // The same call with no gas limit finishes; with 30,000 it runs out before the loop ends, and read fails as simulate fails.
    const lowGas = { ...call, value: 7n, gas: 30_000n };
    const simulated = yield* port.simulate(yield* port.prepare(lowGas)).pipe(Effect.flip);
    const read = yield* port.read(lowGas).pipe(Effect.flip);
    expect(read._tag).toBe("ChainFault");
    expect(read).toMatchObject({ _tag: simulated._tag, kind: (simulated as { kind?: string }).kind });
  }).pipe(Effect.provideService(Timers, timers))));

anvil("read runs inside the port's RPC deadline: an endpoint that accepts and never answers is a timeout fault, through Timers", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const proxy = yield* withProxy(world.rpcUrl);
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: proxy.url, rpcTimeoutMs: 300, refusals: [refusal] });
    const call = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [world.holder] }) };
    expect(yield* port.read(call)).toBe(word(100n));
    yield* stall(proxy);
    const started = yield* Clock.currentTimeMillis;
    const fault = yield* port.read(call).pipe(Effect.flip);
    expect(fault).toMatchObject({ _tag: "ChainFault", kind: "timeout" });
    // Well inside a client's own default of 10 seconds: it is the port's 300 ms deadline that fired.
    expect((yield* Clock.currentTimeMillis) - started).toBeLessThan(3_000);
  }).pipe(Effect.provideService(Timers, timers))));

anvil("a lost endpoint is a ChainFault of the kind simulate gives for it, not a defect", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const proxy = yield* withProxy(world.rpcUrl);
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: proxy.url, refusals: [refusal] });
    const call = { from: world.holder, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [world.holder] }) };
    const prepared = yield* port.prepare({ ...call, gas: 100_000n });
    yield* lose(proxy);
    const simulated = yield* port.simulate(prepared).pipe(Effect.flip);
    const read = yield* port.read(call).pipe(Effect.flip);
    const kind = (simulated as { kind?: string }).kind;
    expect(kind).toBeTypeOf("string");
    expect(read).toMatchObject({ _tag: "ChainFault", kind });
  }).pipe(Effect.provideService(Timers, timers))));

anvil("read from the zero address is an ordinary sender with no balance", { timeout: 30_000 }, () =>
  onToken((world) => Effect.gen(function* () {
    const port = yield* makeChainPort({ chainId: world.chainId, rpcUrl: world.rpcUrl, refusals: [refusal] });
    const balance = { from: zeroAddress, to: world.token, data: encodeFunctionData({ abi, functionName: "balanceOf", args: [world.holder] }) };
    expect(yield* port.read(balance)).toBe(word(100n));
    const transfer = { from: zeroAddress, to: world.token, data: encodeFunctionData({ abi, functionName: "transfer", args: [world.other, 1n] }) };
    expect(yield* port.read(transfer).pipe(Effect.flip)).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-001", args: { available: 0n, requested: 1n },
    });
  }).pipe(Effect.provideService(Timers, timers))));
