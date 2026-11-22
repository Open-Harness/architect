// The adapter's surface is typed (ST2.02's done-when: "the `erc20` adapter's transfer and `Transfer` event are typed").
// These are compile-time checks: `tsc` over this file (the `typecheck` target) is what judges them, and a wrong type is a
// compile error there, not a failure here. Every `@ts-expect-error` is also a check: when the line stops being an error, `tsc`
// reports the unused directive. The generated files they read are `plan`'s output (generated.test.ts keeps them fresh).
import type { Effect } from "effect";
import type { ContractChain, TypedEvent } from "@orthograph/adapters-abi";
import type { Address, ChainFault, Submission } from "@orthograph/chain-evm/device";
import { describe, expect, expectTypeOf, it } from "vitest";
import { allowance, approve, balanceOf, decimals, name, symbol, totalSupply, transfer, transferFrom } from "../generated/calls.ts";
import type {
  ERC20InsufficientAllowance, ERC20InsufficientBalance, ERC20InvalidApprover, ERC20InvalidReceiver, ERC20InvalidSender, ERC20InvalidSpender,
} from "../generated/errors.ts";
import { Approval, Transfer } from "../generated/events.ts";

type Failure = ERC20InsufficientAllowance | ERC20InsufficientBalance | ERC20InvalidApprover | ERC20InvalidReceiver | ERC20InvalidSender | ERC20InvalidSpender | ChainFault;
type Answer<F extends (...args: never[]) => Effect.Effect<unknown, unknown, unknown>> = Effect.Success<ReturnType<F>>;
const bob: Address = "0x00000000000000000000000000000000000000b0";

/** Never called: it only has to compile. */
const refused = () => {
  // @ts-expect-error the field is `to`, not `recipient`
  transfer({ recipient: bob, value: 1n });
  // @ts-expect-error the value is a bigint, not a number
  transfer({ to: bob, value: 1 });
  // @ts-expect-error the value is a bigint, not a string
  transfer({ to: bob, value: "1" });
  // @ts-expect-error `to` is an Address (`0x...`), not any string
  transfer({ to: "bob", value: 1n });
  // @ts-expect-error `to` is not a bigint
  transfer({ to: 1n, value: 1n });
  // @ts-expect-error `value` is required
  transfer({ to: bob });
  // @ts-expect-error `to` is required
  transfer({ value: 1n });
  // @ts-expect-error an extra field is refused
  transfer({ to: bob, value: 1n, memo: "x" });
  // @ts-expect-error the arguments are required
  transfer();
  // @ts-expect-error a read's argument is `account`
  balanceOf({ owner: bob });
  // @ts-expect-error `name` takes no arguments
  name({});
  // @ts-expect-error transferFrom needs `from`
  transferFrom({ to: bob, value: 1n });
  // @ts-expect-error approve's field is `spender`
  approve({ to: bob, value: 1n });
  // @ts-expect-error allowance needs both
  allowance({ owner: bob });
};

describe("the erc20 calls are typed", () => {
  it("transfer takes exactly { to: Address; value: bigint } and answers the Submission", () => {
    expectTypeOf<Parameters<typeof transfer>>().toEqualTypeOf<[args: { readonly to: Address; readonly value: bigint }]>();
    expectTypeOf<Answer<typeof transfer>>().toEqualTypeOf<Submission>();
    expectTypeOf<ReturnType<typeof transfer>>().toEqualTypeOf<Effect.Effect<Submission, Failure, ContractChain>>();
    expect(refused).toBeTypeOf("function");
  });

  it("the other writes take their named fields and answer the Submission", () => {
    expectTypeOf<Parameters<typeof approve>>().toEqualTypeOf<[args: { readonly spender: Address; readonly value: bigint }]>();
    expectTypeOf<Parameters<typeof transferFrom>>().toEqualTypeOf<[args: { readonly from: Address; readonly to: Address; readonly value: bigint }]>();
    expectTypeOf<Answer<typeof approve>>().toEqualTypeOf<Submission>();
    expectTypeOf<Answer<typeof transferFrom>>().toEqualTypeOf<Submission>();
  });

  it("each read takes its named fields and answers its type: bigint, string, never `number` or `unknown`", () => {
    expectTypeOf<Parameters<typeof balanceOf>>().toEqualTypeOf<[args: { readonly account: Address }]>();
    expectTypeOf<Parameters<typeof allowance>>().toEqualTypeOf<[args: { readonly owner: Address; readonly spender: Address }]>();
    expectTypeOf<Parameters<typeof totalSupply>>().toEqualTypeOf<[]>();
    expectTypeOf<Parameters<typeof decimals>>().toEqualTypeOf<[]>();
    expectTypeOf<Answer<typeof balanceOf>>().toEqualTypeOf<bigint>();
    expectTypeOf<Answer<typeof allowance>>().toEqualTypeOf<bigint>();
    expectTypeOf<Answer<typeof totalSupply>>().toEqualTypeOf<bigint>();
    expectTypeOf<Answer<typeof decimals>>().toEqualTypeOf<bigint>();
    expectTypeOf<Answer<typeof name>>().toEqualTypeOf<string>();
    expectTypeOf<Answer<typeof symbol>>().toEqualTypeOf<string>();
  });

  it("every call needs the contract's chain and fails with the declared errors or a ChainFault, nothing wider", () => {
    expectTypeOf<ReturnType<typeof balanceOf>>().toEqualTypeOf<Effect.Effect<bigint, Failure, ContractChain>>();
    expectTypeOf<ReturnType<typeof name>>().toEqualTypeOf<Effect.Effect<string, Failure, ContractChain>>();
    expectTypeOf<Effect.Error<ReturnType<typeof transfer>>>().toEqualTypeOf<Failure>();
  });
});

describe("the erc20 events are typed", () => {
  type Decoded<F extends (address: Address, fromBlock: bigint) => { decode: (log: never) => Effect.Effect<unknown, unknown> }> =
    Effect.Success<ReturnType<ReturnType<F>["decode"]>>;

  it("Transfer's arguments are { from: Address; to: Address; value: bigint }, its name the literal", () => {
    expectTypeOf<Decoded<typeof Transfer>["args"]>().toEqualTypeOf<{ readonly from: Address; readonly to: Address; readonly value: bigint }>();
    expectTypeOf<Decoded<typeof Transfer>["eventName"]>().toEqualTypeOf<"Transfer">();
    expectTypeOf<Decoded<typeof Transfer>>().toMatchTypeOf<TypedEvent<"Transfer", { readonly from: Address; readonly to: Address; readonly value: bigint }>>();
  });

  it("Approval's arguments are { owner: Address; spender: Address; value: bigint }", () => {
    expectTypeOf<Decoded<typeof Approval>["args"]>().toEqualTypeOf<{ readonly owner: Address; readonly spender: Address; readonly value: bigint }>();
    expectTypeOf<Decoded<typeof Approval>["eventName"]>().toEqualTypeOf<"Approval">();
  });
});

describe("the erc20 errors have typed fields", () => {
  it("ERC20InsufficientBalance has { sender: Address; balance: bigint; needed: bigint }", () => {
    expectTypeOf<ConstructorParameters<typeof ERC20InsufficientBalance>[0]>()
      .toEqualTypeOf<{ readonly sender: Address; readonly balance: bigint; readonly needed: bigint }>();
    expectTypeOf<ERC20InsufficientBalance["sender"]>().toEqualTypeOf<Address>();
    expectTypeOf<ERC20InsufficientBalance["balance"]>().toEqualTypeOf<bigint>();
    expectTypeOf<ERC20InsufficientBalance["needed"]>().toEqualTypeOf<bigint>();
  });

  it("the other five carry theirs", () => {
    expectTypeOf<ERC20InsufficientAllowance["allowance"]>().toEqualTypeOf<bigint>();
    expectTypeOf<ERC20InsufficientAllowance["spender"]>().toEqualTypeOf<Address>();
    expectTypeOf<ERC20InsufficientAllowance["needed"]>().toEqualTypeOf<bigint>();
    expectTypeOf<ERC20InvalidSender["sender"]>().toEqualTypeOf<Address>();
    expectTypeOf<ERC20InvalidReceiver["receiver"]>().toEqualTypeOf<Address>();
    expectTypeOf<ERC20InvalidApprover["approver"]>().toEqualTypeOf<Address>();
    expectTypeOf<ERC20InvalidSpender["spender"]>().toEqualTypeOf<Address>();
  });
});
