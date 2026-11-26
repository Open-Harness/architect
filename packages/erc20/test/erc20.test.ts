// A2's checks that need no chain (#1162): the contract's ABI is OpenZeppelin 5's ERC-20 with the test token's constructor, the
// `Transfer` event source is the standard event at the token's address and decodes a log to typed arguments, and the module's
// surface is the shape `--from-abi` makes (packages/generators/src/modules/abi/README.md). The types at the end are judged by
// `tsc` (the `typecheck` target). Written by the checks author; the type checks follow parked Goal 12's draft (#497,
// `packages/erc20/test/types.test.ts`), with credit.
import { Effect } from "effect";
import { Keys } from "@orthograph/chain-evm";
import type { AbiDocument, Address, ChainError, ChainPort, DecodedEvent, EventSource, Hash, Hex, Signer, Submission } from "@orthograph/chain-evm/device";
import { describe, expect, expectTypeOf, it } from "vitest";
import adapter, { ERC20, calls, standIn } from "../src/index.ts";

// No call in this file reaches the port: a port that records each use, and dies on it, shows it.
const used: Array<string> = [];
const noPort = new Proxy({}, {
  get: (_target, key) => () => {
    used.push(String(key));
    return Effect.die("the offline checks never reach the port");
  },
}) as ChainPort;
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
type Log = Parameters<ReturnType<typeof ERC20.events.Transfer>["decode"]>[0];

/** A mined log, encoded by hand: topic 0, the two indexed addresses, the value as the one data word. */
const logOf = (eventName: "Transfer" | "Approval", address: Address, a: Address, b: Address, value: bigint, at: number): Log => ({
  address,
  topics: [eventName === "Transfer" ? TRANSFER_TOPIC : APPROVAL_TOPIC, word(a), word(b)],
  data: word(value.toString(16)),
  blockNumber: BigInt(at), blockHash: hash(at), transactionHash: hash(at + 1_000), logIndex: at % 7, transactionIndex: 0, removed: false,
});

/** OpenZeppelin 5's ERC20 (its ERC-6093 errors), as a list of signatures, and the test token's constructor. */
const OZ_ERC20 = [
  "constructor(uint256 supply) nonpayable",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 value) nonpayable returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to,uint256 value) nonpayable returns (bool)",
  "function transferFrom(address from,address to,uint256 value) nonpayable returns (bool)",
  "event Approval(address indexed owner,address indexed spender,uint256 value)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "error ERC20InsufficientAllowance(address spender,uint256 allowance,uint256 needed)",
  "error ERC20InsufficientBalance(address sender,uint256 balance,uint256 needed)",
  "error ERC20InvalidApprover(address approver)",
  "error ERC20InvalidReceiver(address receiver)",
  "error ERC20InvalidSender(address sender)",
  "error ERC20InvalidSpender(address spender)",
];
type Item = { readonly type: string; readonly name?: string; readonly stateMutability?: string;
  readonly inputs?: ReadonlyArray<{ readonly name: string; readonly type: string; readonly indexed?: boolean }>;
  readonly outputs?: ReadonlyArray<{ readonly type: string }> };
const signatureOf = (item: Item) => {
  const ins = (item.inputs ?? []).map((p) => `${p.type}${p.indexed ? " indexed" : ""} ${p.name}`).join(",");
  const head = item.type === "constructor" ? `constructor(${ins})` : `${item.type} ${item.name}(${ins})`;
  const mutability = item.type === "function" || item.type === "constructor" ? ` ${item.stateMutability}` : "";
  const outs = item.type === "function" ? ` returns (${(item.outputs ?? []).map((o) => o.type).join(",")})` : "";
  return `${head}${mutability}${outs}`;
};

describe("the ERC20 contract", () => {
  it("is OpenZeppelin 5's ERC-20 with the test token's constructor: every item, nothing more", () => {
    expect((ERC20.abi as ReadonlyArray<Item>).map(signatureOf).sort()).toEqual([...OZ_ERC20].sort());
  });

  it("is the shape --from-abi makes: its exports, its calls, its events, the descriptor", () => {
    expect(Object.keys(ERC20).sort()).toEqual([
      "ERC20InsufficientAllowance", "ERC20InsufficientBalance", "ERC20InvalidApprover", "ERC20InvalidReceiver", "ERC20InvalidSender",
      "ERC20InvalidSpender", "abi", "at", "bytecode", "deploy", "events",
    ]);
    const functions = ["allowance", "approve", "balanceOf", "decimals", "name", "symbol", "totalSupply", "transfer", "transferFrom"];
    expect(Object.keys(ERC20.at({ port: noPort, address: tokenA })).sort()).toEqual(functions);
    expect(Object.keys(ERC20.events).sort()).toEqual(["Approval", "Transfer"]);
    expect(Object.keys(calls)).toEqual(["ERC20"]);
    expect(Object.keys(calls.ERC20).sort()).toEqual(functions);
    expect(standIn).toEqual({ kind: "stand-in", how: "process", what: "ERC20: deployed on the world's Anvil from abi/" });
    expect(adapter).toMatchObject({ kind: "adapter", calls, standIn });
  });

  it("carries the test token's creation code, for its stand-in", () => {
    expect(ERC20.bytecode).toMatch(/^0x(?:[0-9a-f]{2})+$/);
  });
});

describe("ERC20.at", () => {
  it("reaches the chain only when a call runs", () =>
    Effect.runPromise(Effect.gen(function* () {
      used.length = 0;
      ERC20.at({ port: noPort, address: tokenA });
      ERC20.at({ port: noPort, address: tokenB, from: alice });
      ERC20.events.Transfer(tokenA, 0n);
      for (let tick = 0; tick < 5; tick++) yield* Effect.yieldNow;
      yield* Effect.promise(() => new Promise((resolve) => setImmediate(resolve)));
      expect(used).toEqual([]);
    })));
});

describe("the Transfer event source", () => {
  it("is the standard Transfer event, at the token's address, from the block asked", () => {
    for (const [address, fromBlock] of [[tokenA, 7n], [tokenB, 123_456n]] as const) {
      const source = ERC20.events.Transfer(address, fromBlock);
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
        const event = yield* ERC20.events.Transfer(c.address, 0n).decode(logOf("Transfer", c.address, c.from, c.to, c.value, c.at));
        expect(event).toEqual({
          eventName: "Transfer", args: { from: c.from, to: c.to, value: c.value }, address: c.address,
          blockNumber: BigInt(c.at), blockHash: hash(c.at), transactionHash: hash(c.at + 1_000), logIndex: c.at % 7,
        });
      }
    })));

  it("refuses a log that is not this token's Transfer: an Approval, or a Transfer of another contract", () =>
    Effect.runPromise(Effect.gen(function* () {
      const source = ERC20.events.Transfer(tokenA, 0n);
      const approval = yield* Effect.flip(source.decode(logOf("Approval", tokenA, alice, bob, 5n, 50)));
      expect(approval).toMatchObject({ _tag: "ChainFault", kind: "event" });
      const elsewhere = yield* Effect.flip(source.decode(logOf("Transfer", tokenB, alice, bob, 5n, 51)));
      expect(elsewhere).toMatchObject({ _tag: "ChainFault", kind: "event" });
    })));

  it("refuses a log a reorg removed, one not yet mined, and one missing its indexed topics", () =>
    Effect.runPromise(Effect.gen(function* () {
      const source = ERC20.events.Transfer(tokenA, 0n);
      const good = logOf("Transfer", tokenA, alice, bob, 5n, 52);
      for (const bad of [
        { ...good, removed: true },
        { ...good, blockHash: null, blockNumber: null, transactionHash: null, logIndex: null },
        { ...good, blockHash: null },
        { ...good, topics: good.topics.slice(0, 2) as Log["topics"] },
      ] as ReadonlyArray<Log>) {
        expect(yield* Effect.flip(source.decode(bad))).toMatchObject({ _tag: "ChainFault", kind: "event" });
      }
    })));
});

// Compile-time checks: a wrong type is a `tsc` error in the typecheck target. Each `@ts-expect-error` is one too: when the line
// stops being an error, `tsc` reports the unused directive. Never called.
type Token = ReturnType<typeof ERC20.at>;
const refused = (token: Token, signer: Signer) => {
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
  // @ts-expect-error deploy needs the supply
  ERC20.deploy(noPort, signer, {});
};

type Failure = ERC20.Refusal | ChainError;
type TransferEvent = DecodedEvent & { readonly eventName: "Transfer"; readonly args: ERC20.TransferEventArgs };

describe("the ERC20 surface is typed", () => {
  it("transfer takes { to, value } and a signer, answers the submission, and fails as a refusal or the port's error", () => {
    expectTypeOf<Parameters<Token["transfer"]>>().toEqualTypeOf<[args: ERC20.TransferArgs, signer: Signer]>();
    expectTypeOf<ERC20.TransferArgs>().toEqualTypeOf<{ readonly to: Address; readonly value: bigint }>();
    expectTypeOf<ReturnType<Token["transfer"]>>().toEqualTypeOf<Effect.Effect<Submission, Failure>>();
    expectTypeOf<ERC20.Refusal>().toEqualTypeOf<
      | ERC20.ERC20InsufficientAllowance | ERC20.ERC20InsufficientBalance | ERC20.ERC20InvalidApprover
      | ERC20.ERC20InvalidReceiver | ERC20.ERC20InvalidSender | ERC20.ERC20InvalidSpender
    >();
    expect(refused).toBeTypeOf("function");
  });

  it("the reads answer bigints: a balance in base units, and the decimals", () => {
    expectTypeOf<Parameters<Token["balanceOf"]>>().toEqualTypeOf<[args: ERC20.BalanceOfArgs]>();
    expectTypeOf<ERC20.BalanceOfArgs>().toEqualTypeOf<{ readonly account: Address }>();
    expectTypeOf<ReturnType<Token["balanceOf"]>>().toEqualTypeOf<Effect.Effect<bigint, Failure>>();
    expectTypeOf<Parameters<Token["decimals"]>>().toEqualTypeOf<[]>();
    expectTypeOf<ReturnType<Token["decimals"]>>().toEqualTypeOf<Effect.Effect<bigint, Failure>>();
    expectTypeOf<ERC20.BalanceOfAnswer>().toEqualTypeOf<bigint>();
    expectTypeOf<ERC20.DecimalsAnswer>().toEqualTypeOf<bigint>();
  });

  it("the contract is where its chain says, and deploys from a supply to an address", () => {
    expectTypeOf<ERC20.Chain>().toEqualTypeOf<{ readonly port: ChainPort; readonly address: Address; readonly from?: Address }>();
    expectTypeOf<ERC20.ConstructorArgs>().toEqualTypeOf<{ readonly supply: bigint }>();
    expectTypeOf<typeof ERC20.deploy>().toEqualTypeOf<(port: ChainPort, signer: Signer, args: ERC20.ConstructorArgs) => Effect.Effect<Address, Failure>>();
    expectTypeOf<typeof ERC20.abi>().toEqualTypeOf<AbiDocument>();
    expectTypeOf<typeof ERC20.bytecode>().toEqualTypeOf<Hex>();
  });

  it("Transfer is a typed event source: { from, to, value }, named the literal", () => {
    expectTypeOf<typeof ERC20.events.Transfer>().toEqualTypeOf<(address: Address, fromBlock: bigint) => EventSource<TransferEvent>>();
    expectTypeOf<ERC20.TransferEventArgs>().toEqualTypeOf<{ readonly from: Address; readonly to: Address; readonly value: bigint }>();
  });

  it("the errors' fields are typed", () => {
    expectTypeOf<ConstructorParameters<typeof ERC20.ERC20InsufficientBalance>[0]>()
      .toEqualTypeOf<{ readonly sender: Address; readonly balance: bigint; readonly needed: bigint }>();
    expectTypeOf<ConstructorParameters<typeof ERC20.ERC20InvalidReceiver>[0]>().toEqualTypeOf<{ readonly receiver: Address }>();
    expectTypeOf<ConstructorParameters<typeof ERC20.ERC20InsufficientAllowance>[0]>()
      .toEqualTypeOf<{ readonly spender: Address; readonly allowance: bigint; readonly needed: bigint }>();
    expectTypeOf<ConstructorParameters<typeof ERC20.ERC20InvalidSpender>[0]>().toEqualTypeOf<{ readonly spender: Address }>();
    expectTypeOf<ERC20.ERC20InsufficientBalance["_tag"]>().toEqualTypeOf<"ERC20InsufficientBalance">();
    expectTypeOf<ERC20.ERC20InvalidReceiver["_tag"]>().toEqualTypeOf<"ERC20InvalidReceiver">();
  });
});
