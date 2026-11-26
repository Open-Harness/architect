// #1163 (A4), "done when", on Anvil (gated as chain-evm's Anvil proofs are: ORTHO_CHAIN_EVM_ANVIL=1): a Roles modifier
// deployed for a Safe, a role scoped to one function with an allowance, passes a call within it, refuses one over it
// (typed), and the allowance reads back reduced by exactly the amount. The modifier judges every refusal; the expected
// statuses are Roles 2.1.1's own (its Status enum), and the expected balances are worked out here from the budget.
import { Effect } from "effect";
import type { Address, ChainError, Hex } from "@orthograph/chain-evm/device";
import { expect, test } from "vitest";
import { tokenBytecode } from "./internal/fixtures/bytecode.ts";
import { checksum, encode, hex, keccak, utf8, word } from "./internal/fixtures/evm.ts";
import {
  anvilGate as gate, attempt, budgetWorld, bySafe, modifierAbi, paymentsAbi, run, safeAbi, token, topicOf, type BudgetWorld,
} from "./internal/fixtures/world.ts";
import { ZodiacRoles } from "./service.ts";
import type { OrgBudget } from "./types.ts";

const roleKey = keccak(utf8("org-budget"));
const key = keccak(utf8("org-budget:token"));
const alice: Address = "0x00000000000000000000000000000000000a11ce";
const bob: Address = "0x0000000000000000000000000000000000000b0b";
const carol: Address = "0x00000000000000000000000000000000000ca201";

// The Org Budget's shape (P/budget-permissions.ts:117-155): at most 60 a send, 100 in all, to alice or bob.
const budgetOf = (overrides: Partial<OrgBudget> = {}) => (ctx: { readonly token: Address; readonly member: Address }): OrgBudget => ({
  roleKey, members: [ctx.member], target: ctx.token, fn: token.transfer,
  amount: { param: 1, limit: 60n }, recipients: { param: 0, anyOf: [alice, bob] },
  allowance: { key, balance: 100n },
  ...overrides,
});
const withRole = (w: BudgetWorld, to: Address, amount: bigint, role: Hex = roleKey) => w.transfer(to, amount).pipe(
  Effect.flatMap((data) => ZodiacRoles.execTransactionWithRole(w.modifier, { to: w.token, data, roleKey: role })));
const typedOf = (refused: ChainError | undefined) => (refused === undefined ? undefined : ZodiacRoles.refusalOf(refused) ?? refused);
const typed = (w: BudgetWorld, from: Address, to: Address, amount: bigint, role: Hex = roleKey) =>
  withRole(w, to, amount, role).pipe(Effect.flatMap((call) => attempt(w, from, call)), Effect.map(typedOf));
const spend = (w: BudgetWorld, to: Address, amount: bigint) => withRole(w, to, amount).pipe(Effect.flatMap((call) => w.send(w.member, call)));
const left = (w: BudgetWorld) => ZodiacRoles.allowance(w.port, w.modifier, key).pipe(Effect.map((allowance) => allowance.balance));

test.skipIf(gate)("the modifier is deployed where ZodiacRoles.deploy said, for the Safe as owner, avatar and target, and the Safe has it enabled", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    const created = w.deployed.logs.filter((log) => log.topics[0] === topicOf("ModuleProxyCreation(address,address)"));
    expect(created.map((log) => [log.topics[1], log.topics[2]])).toEqual([[
      hex(word(BigInt(w.modifier))), hex(word(BigInt("0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5"))),
    ]]);
    const read = (item: typeof modifierAbi.owner) => w.read(w.modifier, item).pipe(Effect.map(([address]) => address));
    expect([yield* read(modifierAbi.owner), yield* read(modifierAbi.avatar), yield* read(modifierAbi.target)]).toEqual([w.safe, w.safe, w.safe].map(checksum));
    expect(yield* w.read(w.safe, safeAbi.isModuleEnabled, [w.modifier])).toEqual([true]);
  })), 60_000);

test.skipIf(gate)("a send within the budget passes, pays exactly that, and the allowance reads back reduced by exactly the amount", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    const before = yield* ZodiacRoles.allowance(w.port, w.modifier, key);
    // A maxRefill of 0 is stored as type(uint128).max (Roles 2.1.1, setAllowance), and timestamp 0 as the block's.
    expect(before).toMatchObject({ balance: 100n, refill: 0n, maxRefill: 2n ** 128n - 1n, period: 0n });
    expect(Object.keys(before).sort()).toEqual(["balance", "maxRefill", "period", "refill", "timestamp"]);
    expect(before.timestamp).toBe(w.allowanceSetAt[0]);
    const receipt = yield* spend(w, alice, 30n);
    expect(receipt.status).toBe("success");
    expect([yield* w.balanceOf(alice), yield* w.balanceOf(w.safe)]).toEqual([30n, 70n]);
    const after = yield* ZodiacRoles.allowance(w.port, w.modifier, key);
    expect(after).toEqual({ ...before, balance: 70n });
    expect(ZodiacRoles.accrued(after, yield* w.now)).toBe(70n);
    // The modifier's own record of it: ConsumeAllowance(key, 30, 70), its three words unindexed.
    const consumed = receipt.logs.filter((log) =>
      log.address.toLowerCase() === w.modifier.toLowerCase() && log.topics[0] === topicOf("ConsumeAllowance(bytes32,uint128,uint128)"));
    expect(consumed.map((log) => log.data)).toEqual([hex(key, word(30n), word(70n))]);
  })), 60_000);

test.skipIf(gate)("a send over what is left is refused AllowanceExceeded, typed, before anything is sent; the rest can still be spent, then nothing", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    yield* spend(w, alice, 60n);
    const nonce = yield* w.nonceOf(w.member.address);
    expect(yield* typed(w, w.member.address, bob, 41n)).toEqual({ _tag: "ConditionViolation", status: "AllowanceExceeded", info: key });
    expect(yield* w.nonceOf(w.member.address)).toBe(nonce);
    expect(yield* left(w)).toBe(40n);
    yield* spend(w, bob, 40n);
    expect(yield* left(w)).toBe(0n);
    expect(yield* typed(w, w.member.address, alice, 1n)).toEqual({ _tag: "ConditionViolation", status: "AllowanceExceeded", info: key });
    expect([yield* w.balanceOf(alice), yield* w.balanceOf(bob), yield* w.balanceOf(w.safe)]).toEqual([60n, 40n, 0n]);
  })), 60_000);

test.skipIf(gate)("the port refuses it as the modifier's ConditionViolation, with its status and info", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    const refused = yield* attempt(w, w.member.address, yield* withRole(w, alice, 61n));
    const entry = ZodiacRoles.refusals.find((item) => item.name === "ConditionViolation");
    expect(refused).toMatchObject({ _tag: "ChainRefusal", name: "ConditionViolation", code: entry?.code ?? "a ConditionViolation entry", args: { status: 9 } });
  })), 60_000);

test.skipIf(gate)("each send is capped at the budget's limit: the limit passes, one more is ParameterGreaterThanAllowed", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    expect(yield* typed(w, w.member.address, alice, 61n)).toMatchObject({ _tag: "ConditionViolation", status: "ParameterGreaterThanAllowed" });
    expect(yield* typed(w, w.member.address, alice, 60n)).toBeUndefined();
    yield* spend(w, alice, 60n);
    expect(yield* left(w)).toBe(40n);
  })), 60_000);

test.skipIf(gate)("a limit of 0 lets nothing through", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf({ amount: { param: 1, limit: 0n } }));
    expect(yield* typed(w, w.member.address, alice, 1n)).toMatchObject({ _tag: "ConditionViolation", status: "ParameterGreaterThanAllowed" });
  })), 60_000);

test.skipIf(gate)("a budget with no limit is bounded by its allowance alone", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf({ amount: { param: 1 } }));
    expect(yield* typed(w, w.member.address, alice, 100n)).toBeUndefined();
    expect(yield* typed(w, w.member.address, alice, 101n)).toEqual({ _tag: "ConditionViolation", status: "AllowanceExceeded", info: key });
  })), 60_000);

test.skipIf(gate)("a recipient not on the budget is refused OrViolation; with recipients anyone, any recipient passes", () =>
  run(Effect.gen(function* () {
    const listed = yield* budgetWorld(budgetOf());
    expect(yield* typed(listed, listed.member.address, carol, 1n)).toMatchObject({ _tag: "ConditionViolation", status: "OrViolation" });
    expect(yield* typed(listed, listed.member.address, bob, 1n)).toBeUndefined();
    const anyone = yield* budgetWorld(budgetOf({ recipients: "anyone" }));
    expect(yield* typed(anyone, anyone.member.address, carol, 1n)).toBeUndefined();
    yield* spend(anyone, carol, 5n);
    expect(yield* anyone.balanceOf(carol)).toBe(5n);
  })), 60_000);

test.skipIf(gate)("the role reaches only its one function of its one target, sends no value, and only its members hold it, under its own key", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    const call = (to: Address, data: Hex, value?: bigint) =>
      ZodiacRoles.execTransactionWithRole(w.modifier, { to, data, roleKey, ...(value === undefined ? {} : { value }) })
        .pipe(Effect.flatMap((made) => attempt(w, w.member.address, made)), Effect.map(typedOf));
    expect(yield* call(w.token, yield* encode(token.refuseEmpty, []))).toMatchObject({ _tag: "ConditionViolation", status: "FunctionNotAllowed" });
    const other = yield* w.deploy(w.deployer, tokenBytecode);
    expect(yield* call(other, yield* w.transfer(alice, 1n))).toMatchObject({ _tag: "ConditionViolation", status: "TargetAddressNotAllowed" });
    yield* w.fund(w.safe, 10n ** 18n);
    expect(yield* call(w.token, yield* w.transfer(alice, 1n), 1n)).toMatchObject({ _tag: "ConditionViolation", status: "SendNotAllowed" });
    // Someone the role was never assigned to is not one of the modifier's modules at all; a member under a role it does not hold has no membership.
    expect(yield* typed(w, w.stranger.address, alice, 1n)).toEqual({ _tag: "NotAuthorized", sender: checksum(w.stranger.address) });
    expect(yield* typed(w, w.member.address, alice, 1n, keccak(utf8("another-role")))).toEqual({ _tag: "NoMembership" });
  })), 60_000);

test.skipIf(gate)("a call the role allows but the token refuses is ModuleTransactionFailed, and spends nothing", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf({ allowance: { key, balance: 1_000n }, amount: { param: 1, limit: 500n } }));
    expect(yield* typed(w, w.member.address, alice, 200n)).toEqual({ _tag: "ModuleTransactionFailed" });
    expect(yield* left(w)).toBe(1_000n);
  })), 60_000);

test.skipIf(gate)("an allowance with a refill period: what accrued is what can be spent, and not a unit more", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf({ allowance: { key, balance: 30n, refill: 25n, maxRefill: 70n, period: 3600n } }));
    yield* spend(w, alice, 30n);
    const spent = yield* ZodiacRoles.allowance(w.port, w.modifier, key);
    expect(spent).toMatchObject({ balance: 0n, refill: 25n, maxRefill: 70n, period: 3600n });
    expect(ZodiacRoles.accrued(spent, yield* w.now)).toBe(0n);
    // Two whole periods pass: 0 + 2 × 25 = 50, under the cap of 70.
    yield* w.later(7200);
    expect(ZodiacRoles.accrued(spent, yield* w.now)).toBe(50n);
    expect(yield* typed(w, w.member.address, alice, 51n)).toEqual({ _tag: "ConditionViolation", status: "AllowanceExceeded", info: key });
    expect(yield* typed(w, w.member.address, alice, 50n)).toBeUndefined();
    // Two more: 50 + 2 × 25 = 100, capped at 70. The limit, 60, goes through.
    yield* w.later(7200);
    expect(ZodiacRoles.accrued(spent, yield* w.now)).toBe(70n);
    yield* spend(w, alice, 60n);
    const after = yield* ZodiacRoles.allowance(w.port, w.modifier, key);
    expect(after.balance).toBe(10n);
    expect(ZodiacRoles.accrued(after, yield* w.now)).toBe(10n);
  })), 60_000);

test.skipIf(gate)("only the Safe, the modifier's owner, can change the budget", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(budgetOf());
    const [first] = yield* ZodiacRoles.budgetCalls(w.modifier, budgetOf()({ token: w.token, member: w.stranger.address }));
    if (!first) return yield* Effect.fail(new Error("No budget call"));
    expect(typedOf(yield* attempt(w, w.stranger.address, first))).toEqual({ _tag: "OwnableUnauthorizedAccount", account: checksum(w.stranger.address) });
    yield* bySafe(w, w.safe, w.owner, first);
  })), 60_000);

// V3 send's shape (P/budget-permissions.ts:113-263): the payments stand-in's send(item), the item's recipient, token and
// amount scoped inside its tuple. The stand-in pays from its own 100 units of its token; Roles judges only the calldata.
const paymentsBudget = (overrides: Partial<OrgBudget> = {}) => (ctx: { readonly member: Address; readonly payments: Address; readonly paymentsToken: Address }): OrgBudget => ({
  roleKey, members: [ctx.member], target: ctx.payments, fn: paymentsAbi.send,
  amount: { param: [0, 3], limit: 60n }, recipients: { param: [0, 1], anyOf: [alice, bob, carol] },
  token: { param: [0, 2], address: ctx.paymentsToken },
  allowance: { key, balance: 100n },
  ...overrides,
});
const pay = (w: BudgetWorld, from: Address, item: { readonly recipient: Address; readonly token: Address; readonly amount: bigint }) =>
  encode(paymentsAbi.send, [{ settlementId: keccak(utf8(`settlement:${item.amount}`)), ...item }]).pipe(
    Effect.flatMap((data) => ZodiacRoles.execTransactionWithRole(w.modifier, { to: w.payments, data, roleKey })),
    Effect.flatMap((call) => attempt(w, from, call)), Effect.map(typedOf));

test.skipIf(gate)("V3 send's shape: a payment to the third recipient passes, the wrong token, recipient or amount is refused", () =>
  run(Effect.gen(function* () {
    const w = yield* budgetWorld(paymentsBudget());
    const right = { recipient: carol, token: w.paymentsToken, amount: 30n };
    expect(yield* pay(w, w.member.address, { ...right, token: w.token })).toMatchObject({ _tag: "ConditionViolation", status: "ParameterNotAllowed" });
    expect(yield* pay(w, w.member.address, { ...right, recipient: w.member.address })).toMatchObject({ _tag: "ConditionViolation", status: "OrViolation" });
    expect(yield* pay(w, w.member.address, { ...right, amount: 61n })).toMatchObject({ _tag: "ConditionViolation", status: "ParameterGreaterThanAllowed" });
    expect(yield* pay(w, w.member.address, right)).toBeUndefined();
    const data = yield* encode(paymentsAbi.send, [{ settlementId: keccak(utf8("settlement:1")), ...right }]);
    yield* w.send(w.member, yield* ZodiacRoles.execTransactionWithRole(w.modifier, { to: w.payments, data, roleKey }));
    expect([yield* w.balanceOf(carol, w.paymentsToken), yield* w.balanceOf(w.payments, w.paymentsToken)]).toEqual([30n, 70n]);
    expect(yield* left(w)).toBe(70n);
  })), 60_000);

test.skipIf(gate)("amounts over 2^53 are judged exactly: the limit itself passes the role, one more does not", () =>
  run(Effect.gen(function* () {
    const limit = 10n ** 18n + 1n;
    const w = yield* budgetWorld(paymentsBudget({ amount: { param: [0, 3], limit }, allowance: { key, balance: 2n ** 127n } }));
    const item = { recipient: alice, token: w.paymentsToken };
    expect(yield* pay(w, w.member.address, { ...item, amount: limit + 1n })).toMatchObject({ _tag: "ConditionViolation", status: "ParameterGreaterThanAllowed" });
    // Within the role, the stand-in cannot pay it: the role let it through, and the call then failed.
    expect(yield* pay(w, w.member.address, { ...item, amount: limit })).toEqual({ _tag: "ModuleTransactionFailed" });
  })), 60_000);
