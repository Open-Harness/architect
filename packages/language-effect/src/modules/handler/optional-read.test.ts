// #1018: an optional field that has no value comes back from a read by id. A stored row read back leaves an optional
// field's key out when its column is NULL (orthograph's `things/internal/columns.ts`), so a root account has no
// `parentAccount` key. A read by id that names the field must answer without it: not `undefined` under the key, not
// `null`, and never a server that dies on its own answer check. A field that has a value still comes back with it, and a
// required field with no value is still a defect: the read answered outside its declaration. Red on main until #1018 is built.
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
const get = Blueprint.read(Account, { by: "id", fields: ["name", "parentAccount", "accountType"], allowed: [Blueprint.signedIn] });
const ada = { kind: "person", person: "per_ada", via: "session" } as const;

// Rows as a store reads them back: an optional field with no value has no key.
const ROOT = { id: "acc_root", name: "Assets" };
const CHILD = { id: "acc_bank", name: "Bank", parentAccount: "acc_root", accountType: "Bank" };
const HALF = { id: "acc_cash", name: "Cash", parentAccount: "acc_root" };
const NAMELESS = { id: "acc_none", parentAccount: "acc_root" };

const read = async (id: string) => {
  const memory = storeMemory([[Account, ROOT], [Account, CHILD], [Account, HALF], [Account, NAMELESS]]);
  const served = Reads.serve({ name: "account.get", read: get });
  const exit = await Effect.runPromiseExit(served.run({ id }, ada).pipe(Effect.provide(memory.layer)) as never);
  return Exit.isSuccess(exit) ? { answered: exit.value as Record<string, unknown> } : { died: Cause.hasDies(exit.cause), cause: Cause.pretty(exit.cause) };
};

describe("a read by id of a thing with optional fields (#1018)", () => {
  it("answers a root account with neither optional field's key", async () => {
    const r = await read("acc_root");
    expect(r).toEqual({ answered: { name: "Assets" } });
    // toEqual counts a key holding undefined as absent; the wire does not.
    expect(Object.keys(r.answered!)).toEqual(["name"]);
  });

  it("answers both optional fields when they have values", async () => {
    const r = await read("acc_bank");
    expect(r).toEqual({ answered: { name: "Bank", parentAccount: "acc_root", accountType: "Bank" } });
  });

  it("answers one optional field without the other", async () => {
    const r = await read("acc_cash");
    expect(r).toEqual({ answered: { name: "Cash", parentAccount: "acc_root" } });
    expect(Object.keys(r.answered!)).toEqual(["name", "parentAccount"]);
  });

  it("still dies when a required field has no value: the read answered outside its declaration", async () => {
    const r = await read("acc_none");
    expect(r.died).toBe(true);
    expect(r.cause).toContain("account.get answered outside its declaration");
  });
});
