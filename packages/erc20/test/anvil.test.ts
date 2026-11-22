// ST2.02's done-when, on Anvil: the adapter's transfer and `Transfer` event are typed; a revert decodes typed; conformance passes
// against the stand-in. Gated like chain-evm's: ORTHO_CHAIN_EVM_ANVIL=1 (CI sets it). Written by the checks author.
import { readFileSync } from "node:fs";
import { Effect, Option, type Scope, Stream } from "effect";
import {
  AbiAdapters, Conformance, Contract, ContractChain, StandInContract, type AbiItem,
} from "@orthograph/adapters-abi";
import { startWorld, type TestWorld } from "@orthograph/adapters-abi/testing";
import type { Address, Key } from "@orthograph/chain-evm";
import { describe, expect, it } from "vitest";
import * as calls from "../generated/calls.ts";
import * as errors from "../generated/errors.ts";
import { Approval, Transfer } from "../generated/events.ts";

const anvil = it.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1");
const timeout = 120_000;
const json = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const tokenBytecode = (json("../stand-in/bytecode.json") as { bytecode: `0x${string}` }).bytecode;
const brokenBytecode = (json("../../adapters-abi/test/fixtures/broken.json") as { bytecode: `0x${string}` }).bytecode;
const SUPPLY = 1_000_000n * 10n ** 18n;

interface Ctx { readonly world: TestWorld; readonly alice: Key; readonly bob: Key; readonly address: Address }

/** A world with the contract deployed by `StandInContract.deploy` (alice signs) and the chain provided to the body. */
const inWorld = <A, E>(bytecode: `0x${string}`, body: (ctx: Ctx) => Effect.Effect<A, E, ContractChain | Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const world = yield* startWorld;
    const [alice, bob] = world.keys;
    if (alice === undefined || bob === undefined) return yield* Effect.die("the world made fewer than two keys");
    const address = yield* StandInContract.deploy({ port: yield* world.port(), signer: alice.signer, bytecode });
    const port = yield* world.port(yield* Contract.refusals(errors.bindings, address));
    return yield* body({ world, alice, bob, address }).pipe(Effect.provideService(ContractChain, { port, address, signer: alice.signer }));
  })));

describe("the erc20 adapter on Anvil", () => {
  anvil("the stand-in deploys and answers an address; its reads are typed: name, supply, balance", () =>
    inWorld(tokenBytecode, ({ alice, bob, address }) => Effect.gen(function* () {
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(yield* calls.name()).toBe("Test Token");
      expect(yield* calls.symbol()).toBe("TST");
      expect(yield* calls.decimals()).toBe(18n);
      expect(yield* calls.totalSupply()).toBe(SUPPLY);
      expect(yield* calls.balanceOf({ account: alice.address })).toBe(SUPPLY);
      expect(yield* calls.balanceOf({ account: bob.address })).toBe(0n);
    })), timeout);

  anvil("a typed transfer confirms, and its Transfer event decodes with typed args", () =>
    inWorld(tokenBytecode, ({ alice, bob, world, address }) => Effect.gen(function* () {
      const port = yield* world.port();
      const from = yield* world.blockNumber;
      const submission = yield* calls.transfer({ to: bob.address, value: 5n });
      const included = Option.getOrUndefined(yield* Stream.runHead(port.track(submission, { depth: 1 })));
      expect(included?._tag).toBe("Included");
      const receipt = included?._tag === "Included" ? included.receipt : undefined;
      expect(receipt?.status).toBe("success");
      const log = receipt?.logs[0];
      if (log === undefined) return yield* Effect.die("the transfer left no log");
      const event = yield* Transfer(address, from).decode(log);
      const args: { readonly from: Address; readonly to: Address; readonly value: bigint } = event.args;
      expect(args).toEqual({ from: alice.address, to: bob.address, value: 5n });
      expect(yield* calls.balanceOf({ account: bob.address })).toBe(5n);
      expect(yield* calls.balanceOf({ account: alice.address })).toBe(SUPPLY - 5n);
      const polled = yield* port.follow(Transfer(address, from), { depth: 1 }).poll();
      expect(polled.changes).toContainEqual(expect.objectContaining({ _tag: "Confirmed", event: expect.objectContaining({ args }) }));
    })), timeout);

  anvil("an approval and a transferFrom make an Approval event and move the allowance", () =>
    inWorld(tokenBytecode, ({ alice, bob, world, address }) => Effect.gen(function* () {
      const port = yield* world.port();
      const from = yield* world.blockNumber;
      yield* Stream.runHead(port.track(yield* calls.approve({ spender: bob.address, value: 8n }), { depth: 1 }));
      expect(yield* calls.allowance({ owner: alice.address, spender: bob.address })).toBe(8n);
      const polled = yield* port.follow(Approval(address, from), { depth: 1 }).poll();
      expect(polled.changes).toContainEqual(expect.objectContaining({
        _tag: "Confirmed", event: expect.objectContaining({ args: { owner: alice.address, spender: bob.address, value: 8n } }),
      }));
    })), timeout);

  anvil("a transfer beyond the balance fails in simulation as ERC20InsufficientBalance with its fields, and nothing is sent", () =>
    inWorld(tokenBytecode, ({ alice, bob, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(alice);
      const head = yield* world.blockNumber;
      const failure = yield* Effect.flip(calls.transfer({ to: bob.address, value: SUPPLY + 1n }));
      expect(failure).toBeInstanceOf(errors.ERC20InsufficientBalance);
      expect(failure).toMatchObject({ sender: alice.address, balance: SUPPLY, needed: SUPPLY + 1n });
      expect(yield* world.nonceOf(alice)).toBe(nonce);
      expect(yield* world.blockNumber).toBe(head);
    })), timeout);

  anvil("the contract's other errors decode to their own classes: no allowance, a zero receiver, a zero spender", () =>
    inWorld(tokenBytecode, ({ alice, bob }) => Effect.gen(function* () {
      const zero = "0x0000000000000000000000000000000000000000" as const;
      const allowance = yield* Effect.flip(calls.transferFrom({ from: bob.address, to: alice.address, value: 1n }));
      expect(allowance).toBeInstanceOf(errors.ERC20InsufficientAllowance);
      expect(allowance).toMatchObject({ spender: alice.address, allowance: 0n, needed: 1n });
      const receiver = yield* Effect.flip(calls.transfer({ to: zero, value: 1n }));
      expect(receiver).toBeInstanceOf(errors.ERC20InvalidReceiver);
      expect(receiver).toMatchObject({ receiver: zero });
      const spender = yield* Effect.flip(calls.approve({ spender: zero, value: 1n }));
      expect(spender).toBeInstanceOf(errors.ERC20InvalidSpender);
      expect(spender).toMatchObject({ spender: zero });
    })), timeout);

  anvil("a revert with an unknown selector, and a revert with empty data, stay ChainFault", () =>
    inWorld(brokenBytecode, ({ alice, bob, world }) => Effect.gen(function* () {
      const nonce = yield* world.nonceOf(alice);
      const unknown = yield* Effect.flip(calls.transfer({ to: bob.address, value: 1n }));
      expect(unknown).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(unknown).not.toBeInstanceOf(errors.ERC20InsufficientBalance);
      const empty = yield* Effect.flip(calls.approve({ spender: bob.address, value: 1n }));
      expect(empty).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(yield* world.nonceOf(alice)).toBe(nonce);
    })), timeout);

  anvil("conformance passes against the stand-in", () =>
    inWorld(tokenBytecode, () => Effect.gen(function* () {
      const abi = (yield* AbiAdapters.parse(json("../abi.json"))) as ReadonlyArray<AbiItem>;
      const report = yield* Conformance.run({ abi, errors: errors.bindings });
      expect(report.disagreements).toEqual([]);
      expect(report.ok).toBe(true);
      expect(report.agrees).toContain("function transfer");
      expect(report.agrees).toContain("event Transfer");
    })), timeout);

  anvil("conformance names the disagreement against a token whose code lacks approve and decimals", () =>
    inWorld(brokenBytecode, () => Effect.gen(function* () {
      const abi = yield* AbiAdapters.parse(json("../abi.json"));
      const report = yield* Conformance.run({ abi, errors: errors.bindings });
      expect(report.ok).toBe(false);
      expect(report.disagreements.map((d) => d.item)).toEqual(["event Approval", "function approve", "function decimals", "function transfer"]);
      expect(report.disagreements.find((d) => d.item === "function approve")).toMatchObject({ kind: "no-such-function" });
    })), timeout);
});
