// #1018: an optional field that has no value comes back from a read by id. A stored row read back leaves an optional
// field's key out when its column is NULL (orthograph's `things/internal/columns.ts`), so a root account has no
// `parentAccount` key. A read by id that names the field must answer without it: not `undefined` under the key, not
// `null`, and never a server that dies on its own answer check. A field that has a value still comes back with it, and a
// required field with no value is still a defect: the read answered outside its declaration. The same holds for a read
// by id with a derive, for the thing's own fields and for an optional field the derive adds. Two things with other field
// names and ids hold it, so no answer keyed on one name or one id passes. A stored `null` for an optional field is out of
// scope: no store hands one back (D1's read-back drops the key). Red on main until #1018 is built.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory } from "#modules/records/service.js";
import { Reads } from "./service.ts";

const Account = Blueprint.thing({
  description: "An account in a chart.",
  fields: {
    id: Blueprint.id("acc"),
    name: Blueprint.text({ max: 140 }),
    parentAccount: Blueprint.optional(Blueprint.id("acc")),
    accountType: Blueprint.optional(Blueprint.text({ max: 40 })),
  },
});
const CostCenter = Blueprint.thing({
  description: "A cost center in a tree.",
  fields: {
    id: Blueprint.id("ccr"),
    label: Blueprint.text({ max: 140 }),
    parentCostCenter: Blueprint.optional(Blueprint.id("ccr")),
    owner: Blueprint.optional(Blueprint.text({ max: 40 })),
  },
});
// What a derive works out for an account: its depth always, a nickname only for some.
const Placed = Blueprint.derive(Account, {
  looks: {},
  adds: { depth: Blueprint.text({ max: 4 }), nickname: Blueprint.optional(Blueprint.text({ max: 20 })) },
  is: (root) => {
    const r = root as { parentAccount?: string; name?: string };
    return (r.name === "Bank" ? { depth: r.parentAccount === undefined ? "0" : "1", nickname: "bk" } : { depth: r.parentAccount === undefined ? "0" : "1" }) as never;
  },
});

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const ACCOUNTS = [
  { id: "acc_root", name: "Assets" },
  { id: "acc_bank", name: "Bank", parentAccount: "acc_root", accountType: "Bank" },
  { id: "acc_cash", name: "Cash", parentAccount: "acc_root" },
  { id: "acc_none", parentAccount: "acc_root" },
];
const CENTERS = [
  { id: "ccr_top", label: "Main" },
  { id: "ccr_ops", label: "Ops", parentCostCenter: "ccr_top", owner: "olga" },
  { id: "ccr_lab", label: "Lab", owner: "cy" },
  { id: "ccr_bad", owner: "cy" },
];
const READS = {
  account: Reads.serve({ name: "account.get", read: Blueprint.read(Account, { by: "id", fields: ["name", "parentAccount", "accountType"], allowed: [Blueprint.signedIn] }) }),
  center: Reads.serve({ name: "cost-center.get", read: Blueprint.read(CostCenter, { by: "id", fields: ["label", "parentCostCenter", "owner"], allowed: [Blueprint.signedIn] }) }),
  placed: Reads.serve({ name: "account.placed", read: Blueprint.read(Account, { by: "id", fields: ["name", "parentAccount", "accountType"], derive: Placed, allowed: [Blueprint.signedIn] }) } as never),
} as const;

/** How a read of one id ended: its answer, or whether it died and why. */
const read = async (which: keyof typeof READS, id: string) => {
  const memory = storeMemory([...ACCOUNTS.map((a) => [Account, a] as const), ...CENTERS.map((c) => [CostCenter, c] as const)]);
  const exit = await Effect.runPromiseExit(READS[which].run({ id }, ada).pipe(Effect.provide(memory.layer)) as never);
  return Exit.isSuccess(exit) ? { answered: exit.value as Record<string, unknown> } : { died: Cause.hasDies(exit.cause), cause: Cause.pretty(exit.cause) };
};
/** The answer, and its keys: toEqual counts a key holding undefined as absent, and the wire does not. */
const expectAnswer = async (which: keyof typeof READS, id: string, answer: Record<string, unknown>) => {
  const r = await read(which, id);
  expect(r).toEqual({ answered: answer });
  expect(Object.keys(r.answered!).toSorted()).toEqual(Object.keys(answer).toSorted());
};

describe("a read by id of a thing with optional fields (#1018)", () => {
  it("answers a root account with neither optional field's key", () => expectAnswer("account", "acc_root", { name: "Assets" }));
  it("answers a top cost center with neither optional field's key", () => expectAnswer("center", "ccr_top", { label: "Main" }));
  it("answers one optional field without the other", async () => {
    await expectAnswer("account", "acc_cash", { name: "Cash", parentAccount: "acc_root" });
    await expectAnswer("center", "ccr_lab", { label: "Lab", owner: "cy" });
  });
  it("control: answers both optional fields when they have values", async () => {
    await expectAnswer("account", "acc_bank", { name: "Bank", parentAccount: "acc_root", accountType: "Bank" });
    await expectAnswer("center", "ccr_ops", { label: "Ops", parentCostCenter: "ccr_top", owner: "olga" });
  });
  it("control: still dies when a required field has no value, the read answering outside its declaration", async () => {
    for (const [which, id, name] of [["account", "acc_none", "account.get"], ["center", "ccr_bad", "cost-center.get"]] as const) {
      const r = await read(which, id);
      expect(r.died).toBe(true);
      expect(r.cause).toContain(`${name} answered outside its declaration`);
    }
  });
});

describe("a read by id with a derive, of a thing with optional fields (#1018)", () => {
  it("answers a root account with neither optional field's key, nor the derive's nickname it worked out none of", () =>
    expectAnswer("placed", "acc_root", { name: "Assets", depth: "0" }));
  it("control: answers every field and add that has a value", () =>
    expectAnswer("placed", "acc_bank", { name: "Bank", parentAccount: "acc_root", accountType: "Bank", depth: "1", nickname: "bk" }));
});
