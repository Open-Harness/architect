// A read and a write against a deployed contract, on Anvil (ST2-abi-adapters section 3). The contract is the ERC-20 stand-in
// deployed by hand with the chain's own port; the ABI is `erc20/abi.json`, read as data. Gated like chain-evm's: ORTHO_CHAIN_EVM_ANVIL=1.
import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { anvilOn, bindings, brokenBytecode, erc20Abi, fn, onChain, tokenBytecode } from "../../../test/support.ts";
import { Contract } from "./service.ts";

const SUPPLY = 1_000_000n * 10n ** 18n;
const anvil = it.skipIf(!anvilOn);
const timeout = 60_000;

describe("Contract.refusals", () => {
  it("is the contract's errors as the refusal lock, each at the contract's address with its own code and selector", async () => {
    const address = "0x00000000000000000000000000000000000000aa" as const;
    const lock = await Effect.runPromise(Contract.refusals(bindings, address));
    expect(lock).toHaveLength(6);
    const balance = lock.find((entry) => entry.name === "ERC20InsufficientBalance");
    expect(balance).toMatchObject({
      code: "erc20.ERC20InsufficientBalance", signature: "ERC20InsufficientBalance(address,uint256,uint256)",
      selector: "0xe450d38c", program: address,
    });
    expect(balance?.abi.inputs.map((input) => input.name)).toEqual(["sender", "balance", "needed"]);
    expect(lock.map((entry) => entry.code).sort()).toEqual(erc20Abi.flatMap((i) => i.type === "error" ? [`erc20.${(i as { name: string }).name}`] : []).sort());
  });
});

describe("Contract.read, on Anvil", () => {
  anvil("answers each output typed: a bigint, a string, and by the arguments' names", () =>
    onChain(tokenBytecode, ({ deployer, other }) => Effect.gen(function* () {
      expect(yield* Contract.read(fn("totalSupply"), {}, bindings)).toBe(SUPPLY);
      expect(yield* Contract.read(fn("balanceOf"), { account: deployer.address }, bindings)).toBe(SUPPLY);
      expect(yield* Contract.read(fn("balanceOf"), { account: other.address }, bindings)).toBe(0n);
      expect(yield* Contract.read(fn("allowance"), { spender: other.address, owner: deployer.address }, bindings)).toBe(0n);
      expect(yield* Contract.read(fn("name"), {}, bindings)).toBe("Test Token");
      expect(yield* Contract.read(fn("symbol"), {}, bindings)).toBe("TST");
      expect(yield* Contract.read(fn("decimals"), {}, bindings)).toBe(18n);
    })), timeout);

  anvil("sends nothing: the head and the nonce are where they were", () =>
    onChain(tokenBytecode, ({ deployer, world }) => Effect.gen(function* () {
      const head = yield* world.blockNumber;
      const nonce = yield* world.nonceOf(deployer);
      yield* Contract.read(fn("totalSupply"), {}, bindings);
      expect(yield* world.blockNumber).toBe(head);
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
    })), timeout);

  anvil("a function the code does not have answers a ChainFault (revert, no data), not a value", () =>
    onChain(brokenBytecode, () => Effect.gen(function* () {
      const failure = yield* Effect.flip(Contract.read(fn("decimals"), {}, bindings));
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "revert" });
    }), { refusals: true }), timeout);
});

describe("Contract.write, on Anvil", () => {
  anvil("simulates, signs and submits, and answers the Submission; the arguments are by name, in any order", () =>
    onChain(tokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(deployer);
      const submission = yield* Contract.write(fn("transfer"), { value: 5n, to: other.address }, bindings);
      expect(submission).toMatchObject({ from: deployer.address, nonce });
      expect(submission.hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(yield* world.nonceOf(deployer)).toBe(nonce + 1);
    })), timeout);

  anvil("a transfer's effect is on chain once it is included: the recipient holds it", () =>
    onChain(tokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const port = yield* world.port();
      const submission = yield* Contract.write(fn("transfer"), { to: other.address, value: 7n }, bindings);
      yield* Stream.runHead(port.track(submission, { depth: 1 }));
      expect(yield* Contract.read(fn("balanceOf"), { account: other.address }, bindings)).toBe(7n);
      expect(yield* Contract.read(fn("balanceOf"), { account: deployer.address }, bindings)).toBe(SUPPLY - 7n);
    })), timeout);

  anvil("a revert by a declared error fails as that error with its fields, and nothing is sent", () =>
    onChain(tokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const head = yield* world.blockNumber;
      const nonce = yield* world.nonceOf(deployer);
      const failure = yield* Effect.flip(Contract.write(fn("transfer"), { to: other.address, value: SUPPLY + 1n }, bindings));
      expect(failure).toEqual({ _tag: "ERC20InsufficientBalance", sender: deployer.address, balance: SUPPLY, needed: SUPPLY + 1n });
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
      expect(yield* world.blockNumber).toBe(head);
    })), timeout);

  anvil("a revert by another declared error decodes by its own selector: no allowance is ERC20InsufficientAllowance", () =>
    onChain(tokenBytecode, ({ deployer, other }) => Effect.gen(function* () {
      const failure = yield* Effect.flip(Contract.write(fn("transferFrom"), { from: other.address, to: deployer.address, value: 1n }, bindings));
      expect(failure).toEqual({ _tag: "ERC20InsufficientAllowance", spender: deployer.address, allowance: 0n, needed: 1n });
    })), timeout);

  anvil("a revert by an error whose selector is not the contract's declared ones stays ChainFault, and nothing is sent", () =>
    onChain(brokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(deployer);
      const failure = yield* Effect.flip(Contract.write(fn("transfer"), { to: other.address, value: 1n }, bindings));
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
    })), timeout);

  anvil("a function the code does not have reverts without data: ChainFault, nothing sent", () =>
    onChain(brokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(deployer);
      const failure = yield* Effect.flip(Contract.write(fn("approve"), { spender: other.address, value: 1n }, bindings));
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
    })), timeout);

  anvil("without a signer a write is a ChainFault of kind configuration, and nothing is sent", () =>
    onChain(tokenBytecode, ({ deployer, other, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(deployer);
      const failure = yield* Effect.flip(Contract.write(fn("transfer"), { to: other.address, value: 1n }, bindings));
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "configuration" });
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
    }), { signer: false }), timeout);
});
