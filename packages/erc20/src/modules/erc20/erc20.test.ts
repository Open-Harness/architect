// A2's checks that need no chain (#1162): the `Transfer` event source is the standard event at the token's address, and it
// decodes a log to typed arguments. The types at the end are judged by `tsc` (the `typecheck` target). Written by the
// checks author; the type checks follow parked Goal 12's draft (#497, `packages/erc20/test/types.test.ts`), with credit.
import { Effect } from "effect";
import type { Address, ChainError, ChainPort, EventSource, Hash, Signer, Submission } from "@orthograph/chain-evm/device";
import { Keys } from "@orthograph/chain-evm";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  Erc20, ERC20InsufficientBalance, ERC20InvalidReceiver, TestToken,
  type Erc20Refusal, type Erc20Token, type TransferArgs, type TransferEvent,
} from "../../main.ts";

// No call in this file reaches the port: a port that dies on any use shows it.
const noPort = new Proxy({}, { get: () => () => Effect.die("the offline checks never reach the port") }) as ChainPort;
const tokenA: Address = "0x1111111111111111111111111111111111111111";
const tokenB: Address = "0x2222222222222222222222222222222222222222";
// Checksummed, as every address the chain port decodes is (EIP-55).
const alice: Address = Keys.checksum("0x00000000000000000000000000000000000a11ce");
const bob: Address = Keys.checksum("0x0000000000000000000000000000000000000b0b");
const keccak = (text: string): Hash => `0x${Buffer.from(Keys.keccak256(new TextEncoder().encode(text))).toString("hex")}`;
// The topic every ERC-20 Transfer log carries, and an Approval's, worked out here.
const TRANSFER_TOPIC = keccak("Transfer(address,address,uint256)");
const APPROVAL_TOPIC = keccak("Approval(address,address,uint256)");
const word = (hex: string): Hash => `0x${hex.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;
const hash = (n: number): Hash => word(n.toString(16));
type Log = Parameters<EventSource<TransferEvent>["decode"]>[0];

/** A mined log, encoded by hand: topic 0, the two indexed addresses, the value as the one data word. */
const logOf = (eventName: "Transfer" | "Approval", address: Address, a: Address, b: Address, value: bigint, at: number): Log => ({
  address,
  topics: [eventName === "Transfer" ? TRANSFER_TOPIC : APPROVAL_TOPIC, word(a), word(b)],
  data: word(value.toString(16)),
  blockNumber: BigInt(at), blockHash: hash(at), transactionHash: hash(at + 1_000), logIndex: at % 7, transactionIndex: 0, removed: false,
});

describe("the Transfer event source", () => {
  it("is the standard Transfer event, at the token's address, from the block asked", () => {
    for (const [address, fromBlock] of [[tokenA, 7n], [tokenB, 123_456n]] as const) {
      const source = Erc20.at(noPort, address).Transfer(fromBlock);
      expect(source.address).toBe(address);
      expect(source.fromBlock).toBe(fromBlock);
      expect(source.event.name).toBe("Transfer");
      expect(keccak(`${source.event.name}(${source.event.inputs.map((input) => input.type).join(",")})`)).toBe(TRANSFER_TOPIC);
      expect(source.event.inputs.map((input) => [input.name, input.type, input.indexed === true])).toEqual([
        ["from", "address", true], ["to", "address", true], ["value", "uint256", false],
      ]);
    }
  });

  it("decodes a Transfer log to its typed arguments and where it was mined", () =>
    Effect.runPromise(Effect.gen(function* () {
      const cases = [
        { address: tokenA, from: alice, to: bob, value: 5_000_000n, at: 40 },
        { address: tokenB, from: bob, to: alice, value: 1n, at: 41 },
      ] as const;
      for (const c of cases) {
        const event = yield* Erc20.at(noPort, c.address).Transfer(0n).decode(logOf("Transfer", c.address, c.from, c.to, c.value, c.at));
        expect(event).toEqual({
          eventName: "Transfer", args: { from: c.from, to: c.to, value: c.value }, address: c.address,
          blockNumber: BigInt(c.at), blockHash: hash(c.at), transactionHash: hash(c.at + 1_000), logIndex: c.at % 7,
        });
      }
    })));

  it("refuses a log that is not this token's Transfer: an Approval, or a Transfer of another contract", () =>
    Effect.runPromise(Effect.gen(function* () {
      const source = Erc20.at(noPort, tokenA).Transfer(0n);
      const approval = yield* Effect.flip(source.decode(logOf("Approval", tokenA, alice, bob, 5n, 50)));
      expect(approval).toMatchObject({ _tag: "ChainFault", kind: "event" });
      const elsewhere = yield* Effect.flip(source.decode(logOf("Transfer", tokenB, alice, bob, 5n, 51)));
      expect(elsewhere).toMatchObject({ _tag: "ChainFault", kind: "event" });
    })));
});

describe("the typed errors", () => {
  it("carry their tags and their fields", () => {
    const short = new ERC20InsufficientBalance({ sender: alice, balance: 3n, needed: 4n });
    expect(short).toMatchObject({ _tag: "ERC20InsufficientBalance", sender: alice, balance: 3n, needed: 4n });
    expect(new ERC20InvalidReceiver({ receiver: bob })).toMatchObject({ _tag: "ERC20InvalidReceiver", receiver: bob });
    expect(TestToken.decimals).toBe(6);
  });
});

// Compile-time checks: a wrong type is a `tsc` error in the typecheck target. Each `@ts-expect-error` is one too: when the line
// stops being an error, `tsc` reports the unused directive. Never called.
const refused = (token: Erc20Token, signer: Signer) => {
  // @ts-expect-error the field is `to`, not `recipient`
  token.transfer({ recipient: bob, value: 1n }, signer);
  // @ts-expect-error the value is a bigint, not a number
  token.transfer({ to: bob, value: 1 }, signer);
  // @ts-expect-error `to` is an Address, not any string
  token.transfer({ to: "bob", value: 1n }, signer);
  // @ts-expect-error `value` is required
  token.transfer({ to: bob }, signer);
  // @ts-expect-error the signer is required
  token.transfer({ to: bob, value: 1n });
  // @ts-expect-error an extra field is refused
  token.transfer({ to: bob, value: 1n, memo: "x" }, signer);
  // @ts-expect-error a balance is read by `account`
  token.balanceOf({ owner: bob });
  // @ts-expect-error decimals takes no arguments
  token.decimals({});
};

describe("the erc20 surface is typed", () => {
  it("transfer takes { to, value } and a signer, answers the submission, and fails typed or as the port's error", () => {
    expectTypeOf<Parameters<Erc20Token["transfer"]>>()
      .toEqualTypeOf<[args: { readonly to: Address; readonly value: bigint }, signer: Signer]>();
    expectTypeOf<ReturnType<Erc20Token["transfer"]>>().toEqualTypeOf<Effect.Effect<Submission, Erc20Refusal | ChainError>>();
    expectTypeOf<Erc20Refusal>().toEqualTypeOf<ERC20InsufficientBalance | ERC20InvalidReceiver>();
    expect(refused).toBeTypeOf("function");
  });

  it("the reads answer a bigint balance and a number of decimals", () => {
    expectTypeOf<Parameters<Erc20Token["balanceOf"]>>().toEqualTypeOf<[args: { readonly account: Address }]>();
    expectTypeOf<ReturnType<Erc20Token["balanceOf"]>>().toEqualTypeOf<Effect.Effect<bigint, ChainError>>();
    expectTypeOf<ReturnType<Erc20Token["decimals"]>>().toEqualTypeOf<Effect.Effect<number, ChainError>>();
  });

  it("Transfer is a typed event source: { from, to, value }, named the literal", () => {
    expectTypeOf<ReturnType<Erc20Token["Transfer"]>>().toEqualTypeOf<EventSource<TransferEvent>>();
    expectTypeOf<TransferEvent["args"]>().toEqualTypeOf<TransferArgs>();
    expectTypeOf<TransferArgs>().toEqualTypeOf<{ readonly from: Address; readonly to: Address; readonly value: bigint }>();
    expectTypeOf<TransferEvent["eventName"]>().toEqualTypeOf<"Transfer">();
  });

  it("the errors' fields are typed", () => {
    expectTypeOf<ConstructorParameters<typeof ERC20InsufficientBalance>[0]>()
      .toEqualTypeOf<{ readonly sender: Address; readonly balance: bigint; readonly needed: bigint }>();
    expectTypeOf<ConstructorParameters<typeof ERC20InvalidReceiver>[0]>().toEqualTypeOf<{ readonly receiver: Address }>();
    expectTypeOf<ERC20InsufficientBalance["_tag"]>().toEqualTypeOf<"ERC20InsufficientBalance">();
    expectTypeOf<ERC20InvalidReceiver["_tag"]>().toEqualTypeOf<"ERC20InvalidReceiver">();
  });
});
