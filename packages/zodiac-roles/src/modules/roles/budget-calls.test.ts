// #1163 (A4), the Org Budget compiled, with no chain: the calls the Safe makes on its modifier, in order, and the condition
// tree `scopeFunction` carries, read back and compared with a tree written out here. The tree is compared as Roles judges
// it, not byte for byte: an And or an Or of one child is that child, and the order of an And's or an Or's children does
// not matter (the implementation's capped and pinned-recipient forms are derived, not asserted: the conductor's reading
// of P/budget-permissions.ts, #1163). Integrity's own rules are checked as they are: the list is in breadth-first order
// and an And or an Or has paramType None. Roles 2.1.1's numbers: ParameterType None 0, Static 1, Dynamic 2, Tuple 3,
// Calldata 5; Operator Pass 0, And 1, Or 2, Matches 5, EqualTo 16, LessThan 18, WithinAllowance 28 (P/zodiac-abi.ts:206-223).
import { Effect } from "effect";
import type { Address, Hex } from "@orthograph/chain-evm/device";
import { describe, expect, test } from "vitest";
import { addressWord, checksum, decodeArgs, fn, keccak, selector, signatureOf, utf8, word } from "./internal/fixtures/evm.ts";
import { ZodiacRoles } from "./service.ts";
import type { ContractCall, OrgBudget } from "./types.ts";

const modifier: Address = "0x0000000000000000000000000000000000000d01";
const target: Address = "0x00000000000000000000000000000000000070c3";
const usdc: Address = "0x0000000000000000000000000000000000005dc0";
const alice: Address = "0x00000000000000000000000000000000000a11ce";
const bob: Address = "0x0000000000000000000000000000000000000b0b";
const carol: Address = "0x00000000000000000000000000000000000ca201";
const m1: Address = "0x000000000000000000000000000000000000beef";
const m2: Address = "0x000000000000000000000000000000000000f00d";
const m3: Address = "0x000000000000000000000000000000000000d00d";
const roleKey = keccak(utf8("org-budget"));
const key = keccak(utf8("org-budget:usdc"));
const transfer = fn("transfer", [["address", "to"], ["uint256", "value"]], [["bool"]]);
// The amount before the recipient, and a dynamic input left unchecked.
const payOut = fn("payOut", [["uint256", "value"], ["string", "memo"], ["address", "to"]]);
// V3 send's shape: one tuple, the recipient, the token and the amount its fields.
const item = [["bytes32", "settlementId"], ["address", "recipient"], ["address", "token"], ["uint256", "amount"], ["bytes", "note"]].map(([type, name]) => ({ type, name }));
const send = fn("send", [["tuple", "item", item as never]]);

const condition = [["uint8", "parent"], ["uint8", "paramType"], ["uint8", "operator"], ["bytes", "compValue"]].map(([type, name]) => ({ type, name })) as never;
const roles = {
  assignRoles: fn("assignRoles", [["address", "module"], ["bytes32[]", "roleKeys"], ["bool[]", "memberOf"]]),
  scopeTarget: fn("scopeTarget", [["bytes32", "roleKey"], ["address", "targetAddress"]]),
  scopeFunction: fn("scopeFunction", [["bytes32", "roleKey"], ["address", "targetAddress"], ["bytes4", "selector"], ["tuple[]", "conditions", condition], ["uint8", "options"]]),
  setAllowance: fn("setAllowance", [["bytes32", "key"], ["uint128", "balance"], ["uint128", "maxRefill"], ["uint128", "refill"], ["uint64", "period"], ["uint64", "timestamp"]]),
};
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fails = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

const decoded = (calls: ReadonlyArray<ContractCall>) => run(Effect.forEach(calls, (call) => {
  const known = Object.values(roles).find((candidate) => selector(signatureOf(candidate)) === call.data.slice(0, 10));
  return known === undefined
    ? Effect.succeed({ to: call.to, value: call.value, name: `unknown ${call.data.slice(0, 10)}`, args: [] as ReadonlyArray<unknown> })
    : decodeArgs(known, call.data).pipe(Effect.map((args) => ({ to: call.to, value: call.value, name: known.name, args })));
}));

interface Flat { readonly parent: number; readonly paramType: number; readonly operator: number; readonly compValue: Hex }
interface Tree { readonly paramType: number; readonly operator: number; readonly compValue: string; readonly children: ReadonlyArray<Tree> }
/** The flat list as Roles reads it: a tree under node 0, an And or an Or of one child taken as that child, their children in any order. */
const treeOf = (flat: ReadonlyArray<Flat>): Tree => {
  const at = (index: number): Tree => {
    const node = flat[index]!;
    const children = flat.flatMap((child, i) => (i > 0 && child.parent === index ? [at(i)] : []));
    const logical = node.operator === 1 || node.operator === 2;
    if (logical && children.length === 1) return children[0]!;
    const ordered = logical ? [...children].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : children;
    return { paramType: node.paramType, operator: node.operator, compValue: node.compValue.toLowerCase(), children: ordered };
  };
  return at(0);
};
const node = (paramType: number, operator: number, compValue = "0x", children: ReadonlyArray<Tree> = []): Tree => ({ paramType, operator, compValue, children });
const any = (...children: ReadonlyArray<Tree>) => node(0, 2, "0x", [...children].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
const all = (...children: ReadonlyArray<Tree>) => node(0, 1, "0x", [...children].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
const pass = node(1, 0);
const passDynamic = node(2, 0);
const equalTo = (address: Address) => node(1, 16, `0x${addressWord(address)}`);
const lessThan = (value: bigint) => node(1, 18, `0x${word(value)}`);
const withinAllowance = node(1, 28, key.toLowerCase());
const calldata = (...children: ReadonlyArray<Tree>) => node(5, 5, "0x", children);

const budget: OrgBudget = {
  roleKey, members: [m1, m2, m3], target, fn: transfer,
  amount: { param: 1, limit: 60n }, recipients: { param: 0, anyOf: [alice, bob, carol] },
  allowance: { key, balance: 100n, maxRefill: 120n, refill: 50n, period: 3600n },
};
const scoped = async (of: OrgBudget) => {
  const calls = await decoded(await run(ZodiacRoles.budgetCalls(modifier, of)));
  const scope = calls.filter((call) => call.name === "scopeFunction");
  expect(scope.length).toBe(1);
  const [role, scopedTarget, scopedSelector, conditions, options] = scope[0]!.args as [Hex, Address, Hex, ReadonlyArray<Flat>, number];
  integral(conditions);
  return { role, target: scopedTarget, selector: scopedSelector, conditions, options };
};
/**
 * Integrity's rules (Roles 2.1.1, Integrity.sol), on every list a check scopes, before the tree collapses anything: the
 * root is the calldata's Matches, node 0, its own parent; every other node's parent comes before it and the parents never go
 * back (breadth first), so every node hangs off the root; an And or an Or has paramType None and a child at least; a Pass,
 * an EqualTo, a LessThan or a WithinAllowance has no child; a Matches has one child for each input or component.
 */
const integral = (conditions: ReadonlyArray<Flat>) => {
  expect(conditions[0]).toEqual({ parent: 0, paramType: 5, operator: 5, compValue: "0x" });
  const children = (index: number) => conditions.filter((child, i) => i > 0 && child.parent === index).length;
  conditions.forEach((flat, index) => {
    if (index > 0) expect(flat.parent).toBeLessThan(index);
    if (index > 1) expect(flat.parent).toBeGreaterThanOrEqual(conditions[index - 1]!.parent);
    if (flat.operator === 1 || flat.operator === 2) {
      expect(flat.paramType).toBe(0);
      expect(children(index)).toBeGreaterThan(0);
    }
    if ([0, 16, 18, 28].includes(flat.operator)) expect(children(index)).toBe(0);
  });
};

describe("the calls", () => {
  test("every call is the Safe's to its modifier, with no value", async () => {
    const calls = await run(ZodiacRoles.budgetCalls(modifier, budget));
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect({ to: call.to, value: call.value }).toEqual({ to: modifier, value: 0n });
  });

  test("in the implementation's order: the allowance, the target, the function, then each member in turn", async () => {
    const calls = await decoded(await run(ZodiacRoles.budgetCalls(modifier, budget)));
    expect(calls.map((call) => call.name)).toEqual(["setAllowance", "scopeTarget", "scopeFunction", "assignRoles", "assignRoles", "assignRoles"]);
    // The modifier takes the block's timestamp for a 0 (Roles 2.1.1, setAllowance).
    expect(calls[0]?.args).toEqual([key, 100n, 120n, 50n, 3600n, 0n]);
    expect(calls[1]?.args).toEqual([roleKey, checksum(target)]);
    expect(calls.slice(3).map((call) => call.args)).toEqual([m1, m2, m3].map((member) => [checksum(member), [roleKey], [true]]));
  });

  test("the function scoped: its role, target and selector, with no value or delegate call", async () => {
    const scope = await scoped(budget);
    // ExecutionOptions None (0). Chosen here, not lifted: the implementation never sets it and relies on zodiac-roles-sdk's default.
    expect([scope.role, scope.target, scope.selector, scope.options]).toEqual([roleKey, checksum(target), selector("transfer(address,uint256)"), 0]);
    expect((await scoped({ ...budget, fn: payOut, amount: { param: 0 }, recipients: { param: 2, anyOf: [alice] } })).selector).toBe(selector("payOut(uint256,string,address)"));
    expect((await scoped({ ...budget, fn: send, amount: { param: [0, 3] }, recipients: "anyone" })).selector).toBe(selector("send((bytes32,address,address,uint256,bytes))"));
  });

  test("an allowance with no refill sets maxRefill, refill and period to 0; amounts over 2^53 are exact", async () => {
    const calls = await decoded(await run(ZodiacRoles.budgetCalls(modifier, { ...budget, allowance: { key, balance: 10n ** 18n + 1n } })));
    expect(calls.filter((call) => call.name === "setAllowance").map((call) => call.args)).toEqual([[key, 10n ** 18n + 1n, 0n, 0n, 0n, 0n]]);
  });
});

describe("the conditions", () => {
  const pull = fn("pull", [["address", "token"], ["address", "to"], ["uint256", "value"]]);
  // A tuple at input 1, and a function with two tuples, the scoped fields in the second.
  const small = [["bool", "flag"], ["address", "to"], ["uint128", "value"], ["bytes32", "ref"], ["int256", "delta"]].map(([type, name]) => ({ type, name }));
  const later = fn("later", [["uint256", "nonce"], ["tuple", "item", small as never]]);
  const two = [["address", "to"], ["uint64", "value"]].map(([type, name]) => ({ type, name }));
  const pair = fn("pair", [["tuple", "first", two as never], ["tuple", "second", two as never]]);
  const many = Array.from({ length: 10 }, (_, i) => `0x${(0xa000 + i).toString(16).padStart(40, "0")}` as Address);
  const cases: ReadonlyArray<readonly [string, OrgBudget, Tree]> = [
    ["transfer: the recipient one of three, the amount at most 60 and within the allowance", budget,
      calldata(any(equalTo(alice), equalTo(bob), equalTo(carol)), all(lessThan(61n), withinAllowance))],
    ["the amount first, a string passed unchecked, the recipient last", { ...budget, fn: payOut, amount: { param: 0, limit: 10n ** 18n + 1n }, recipients: { param: 2, anyOf: [bob] } },
      calldata(all(lessThan(10n ** 18n + 2n), withinAllowance), passDynamic, equalTo(bob))],
    ["a limit of 0 is a limit", { ...budget, amount: { param: 1, limit: 0n } },
      calldata(any(equalTo(alice), equalTo(bob), equalTo(carol)), all(lessThan(1n), withinAllowance))],
    ["the largest limit there can be", { ...budget, amount: { param: 1, limit: 2n ** 256n - 2n }, recipients: "anyone" },
      calldata(pass, all(lessThan(2n ** 256n - 1n), withinAllowance))],
    ["no limit: the allowance alone; recipients anyone pass", { ...budget, amount: { param: 1 }, recipients: "anyone" },
      calldata(pass, withinAllowance)],
    ["one recipient", { ...budget, recipients: { param: 0, anyOf: [carol] } },
      calldata(equalTo(carol), all(lessThan(61n), withinAllowance))],
    ["ten recipients", { ...budget, recipients: { param: 0, anyOf: many } },
      calldata(any(...many.map(equalTo)), all(lessThan(61n), withinAllowance))],
    ["V3 send's shape: the item's fields scoped inside its tuple, the token exactly, the rest passed",
      { ...budget, fn: send, amount: { param: [0, 3], limit: 60n }, recipients: { param: [0, 1], anyOf: [alice, bob] }, token: { param: [0, 2], address: usdc } },
      calldata(node(3, 5, "0x", [pass, any(equalTo(alice), equalTo(bob)), equalTo(usdc), all(lessThan(61n), withinAllowance), passDynamic]))],
    ["a token as an input of the function itself, with a limit and listed recipients", { ...budget, fn: pull, token: { param: 0, address: usdc }, recipients: { param: 1, anyOf: [alice, bob] }, amount: { param: 2, limit: 9n } },
      calldata(equalTo(usdc), any(equalTo(alice), equalTo(bob)), all(lessThan(10n), withinAllowance))],
    ["a token as an input, recipients anyone, a limit", { ...budget, fn: pull, token: { param: 0, address: usdc }, recipients: "anyone", amount: { param: 2, limit: 9n } },
      calldata(equalTo(usdc), pass, all(lessThan(10n), withinAllowance))],
    ["a tuple at input 1, its uint128 amount and its other kinds of field passed", { ...budget, fn: later, amount: { param: [1, 2], limit: 5n }, recipients: { param: [1, 1], anyOf: [alice] } },
      calldata(pass, node(3, 5, "0x", [pass, equalTo(alice), all(lessThan(6n), withinAllowance), pass, pass]))],
    ["two tuples, a field scoped in each: each in its own tuple", { ...budget, fn: pair, amount: { param: [1, 1] }, recipients: { param: [0, 0], anyOf: [bob] } },
      calldata(node(3, 5, "0x", [equalTo(bob), pass]), node(3, 5, "0x", [pass, withinAllowance]))],
  ];
  test.each(cases)("%s", async (_name, of, tree) => {
    expect(treeOf((await scoped(of)).conditions)).toEqual(tree);
  });
});

describe("what a budget may not be", () => {
  const array = fn("batch", [["address[]", "to"], ["uint256", "value"]]);
  const fixed = fn("fixed", [["uint256[2]", "values"], ["address", "to"], ["uint256", "value"]]);
  const nested = fn("nested", [["tuple", "outer", [{ type: "tuple", name: "inner", components: [{ type: "uint256", name: "v" }] }] as never], ["address", "to"]]);
  const withArray = fn("withArray", [["tuple", "item", [{ type: "address", name: "to" }, { type: "uint256", name: "value" }, { type: "address[]", name: "also" }] as never]]);
  const withTuple = fn("withTuple", [["tuple", "item", [{ type: "address", name: "to" }, { type: "uint256", name: "value" }, { type: "tuple", name: "more", components: [{ type: "uint256", name: "v" }] }] as never]]);
  const withString = fn("withString", [["tuple", "item", [{ type: "address", name: "to" }, { type: "uint256", name: "value" }, { type: "string", name: "memo" }] as never]]);
  const bare = fn("bare", [["tuple", "item", [{ type: "uint256", name: "v" }] as never], ["address", "to"], ["uint256", "value"]]);
  const blob = fn("blob", [["bytes", "data"], ["address", "to"], ["uint256", "value"]]);
  const kinds = fn("kinds", [["int256", "delta"], ["bytes32", "ref"], ["address", "to"], ["uint256", "value"], ["bool", "flag"]]);
  const pull = fn("pull", [["address", "token"], ["address", "to"], ["uint256", "value"]]);
  test.each([
    ["a parameter the function does not have", { ...budget, amount: { param: 2, limit: 60n } }],
    ["a recipient parameter the function does not have", { ...budget, recipients: { param: 5, anyOf: [alice] } }],
    ["a token parameter the function does not have", { ...budget, token: { param: 2, address: usdc } }],
    ["a field the tuple does not have", { ...budget, fn: send, amount: { param: [0, 9] }, recipients: "anyone" }],
    ["a field of an input that is not a tuple", { ...budget, amount: { param: [1, 0] } }],
    ["a whole tuple scoped as an amount", { ...budget, fn: send, amount: { param: 0 }, recipients: "anyone" }],
    ["a scoped string", { ...budget, fn: payOut, amount: { param: 1 }, recipients: { param: 2, anyOf: [alice] } }],
    ["a scoped top-level bytes", { ...budget, fn: blob, amount: { param: 0 }, recipients: { param: 1, anyOf: [alice] } }],
    ["a scoped bytes field", { ...budget, fn: send, amount: { param: [0, 4] }, recipients: "anyone" }],
    ["a scoped string field", { ...budget, fn: withString, amount: { param: [0, 2] }, recipients: { param: [0, 0], anyOf: [alice] } }],
    ["an amount that is not a uint (an int256)", { ...budget, fn: kinds, amount: { param: 0 }, recipients: { param: 2, anyOf: [alice] } }],
    ["an amount that is not a uint (a bool)", { ...budget, fn: kinds, amount: { param: 4 }, recipients: { param: 2, anyOf: [alice] } }],
    ["a recipient that is not an address (a bytes32)", { ...budget, fn: kinds, amount: { param: 3 }, recipients: { param: 1, anyOf: [alice] } }],
    ["a token that is not an address (a uint256)", { ...budget, fn: kinds, amount: { param: 3 }, recipients: { param: 2, anyOf: [alice] }, token: { param: 3, address: usdc } }],
    ["an array input", { ...budget, fn: array, amount: { param: 1 }, recipients: "anyone" }],
    ["a scoped array", { ...budget, fn: array, amount: { param: 1 }, recipients: { param: 0, anyOf: [alice] } }],
    ["a fixed-size array input", { ...budget, fn: fixed, amount: { param: 2 }, recipients: { param: 1, anyOf: [alice] } }],
    ["a nested tuple, scoped", { ...budget, fn: nested, amount: { param: [0, 0] }, recipients: { param: 1, anyOf: [alice] } }],
    ["an unscoped array field beside scoped ones", { ...budget, fn: withArray, amount: { param: [0, 1] }, recipients: { param: [0, 0], anyOf: [alice] } }],
    ["an unscoped tuple field beside scoped ones", { ...budget, fn: withTuple, amount: { param: [0, 1] }, recipients: { param: [0, 0], anyOf: [alice] } }],
    ["a tuple input with nothing scoped in it", { ...budget, fn: bare, amount: { param: 2 }, recipients: { param: 1, anyOf: [alice] } }],
    ["the amount and the recipient on one parameter", { ...budget, recipients: { param: 1, anyOf: [alice] } }],
    ["the token and the recipient on one field", { ...budget, fn: send, amount: { param: [0, 3] }, recipients: { param: [0, 1], anyOf: [alice] }, token: { param: [0, 1], address: usdc } }],
    ["the token and the amount on one parameter", { ...budget, fn: pull, amount: { param: 0 }, recipients: "anyone", token: { param: 0, address: usdc } }],
    ["the token and the amount on one field", { ...budget, fn: send, amount: { param: [0, 3] }, recipients: "anyone", token: { param: [0, 3], address: usdc } }],
    ["an empty recipient list", { ...budget, recipients: { param: 0, anyOf: [] } }],
    ["a recipient listed twice", { ...budget, recipients: { param: 0, anyOf: [alice, bob, alice] } }],
    ["a member listed twice", { ...budget, members: [m1, m2, m1] }],
    ["a limit of 2^256 - 1, which no LessThan can hold", { ...budget, amount: { param: 1, limit: 2n ** 256n - 1n } }],
    ["a negative limit", { ...budget, amount: { param: 1, limit: -1n } }],
    ["a negative balance", { ...budget, allowance: { key, balance: -1n } }],
    ["a balance over a uint128", { ...budget, allowance: { key, balance: 2n ** 128n } }],
    ["a negative maxRefill", { ...budget, allowance: { key, balance: 1n, maxRefill: -1n } }],
    ["a maxRefill over a uint128", { ...budget, allowance: { key, balance: 1n, maxRefill: 2n ** 128n } }],
    ["a negative refill", { ...budget, allowance: { key, balance: 1n, refill: -1n, period: 60n } }],
    ["a refill over a uint128", { ...budget, allowance: { key, balance: 1n, refill: 2n ** 128n, period: 60n } }],
    ["a negative period", { ...budget, allowance: { key, balance: 1n, refill: 1n, period: -1n } }],
    ["a period over a uint64", { ...budget, allowance: { key, balance: 1n, refill: 1n, period: 2n ** 64n } }],
  ] as ReadonlyArray<readonly [string, OrgBudget]>)("refused: %s", async (_name, wrong) => {
    expect(await fails(ZodiacRoles.budgetCalls(modifier, wrong))).toMatchObject({ _tag: "ChainFault", kind: "configuration" });
  });

  test("the widest allowance there can be: every field at its type's top", async () => {
    const top = { key, balance: 2n ** 128n - 1n, maxRefill: 2n ** 128n - 1n, refill: 2n ** 128n - 1n, period: 2n ** 64n - 1n };
    const calls = await decoded(await run(ZodiacRoles.budgetCalls(modifier, { ...budget, allowance: top })));
    expect(calls[0]?.args).toEqual([key, top.balance, top.maxRefill, top.refill, top.period, 0n]);
  });

  test("a budget with no members: the allowance and the scope, no assignRoles", async () => {
    const calls = await decoded(await run(ZodiacRoles.budgetCalls(modifier, { ...budget, members: [] })));
    expect(calls.map((call) => call.name)).toEqual(["setAllowance", "scopeTarget", "scopeFunction"]);
  });
});
