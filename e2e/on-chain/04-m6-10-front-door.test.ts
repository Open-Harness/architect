// Goal 4, slice 3 (M6.10: the chain store and values), first check: the front door and what the model records for it
// (`design/goals/04-on-chain.md`; `design/decisions/M6-chain.md` item 2; K25 items 1 and 5). Written by the checks author; a builder never edits this
// file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In a project written in a temp folder, with the real `ortho model --json`:
//   - `Blueprint.store.chain.evm()` makes a store the model lists as `stores.<file name>` with kind `chain.evm`, and a thing that `lives` in it compiles
//     (`things.<thing>.store` names it); `Blueprint.account()` is a value (`type: "account"`), named when wrapped in `Blueprint.value`;
//   - the model records each field's Solidity type, as `solidity` on the field: `uint(bits)` is `uint<bits>` (8, 16, 32, 64, 128, 256 all shown), an id
//     `bytes32`, text `string`, an account `address`, a read's `state` a `uint8`. It does so for every field of a chain-stored thing: its own, its events',
//     its errors', and its operations' payloads and answers. Nothing outside a chain store carries one;
//   - a chain-stored thing with a machine records `stateNumbers`: `absent` is 0, then its declared states from 1 in declaration order, not sorted;
//   - a project may hold chain-stored and database things side by side.
// The expected types come from each field's own `value` meta in the model (`solidityOf`), and the numbers from the machine's own declared list, never from
// the output judged; the literal types of the budgets shape are pinned too, so a wrong mapping fails twice.
//
// WHERE THE SHAPE IS MINE. M6-chain says what the model must record, not where. `solidity` on the field, `stateNumbers` on the thing, `type: "account"` for
// the value and `kind: "chain.evm"` for the store are the checks author's reading (the surface.json of item 3 names the same types and the states list);
// they are in the pull request's "Questions for the lead". Change them in the lead's words and this file follows.
//
// THE CONTROLS plant wrong models against `solidityProblems`: one field of many wrong, a wrong type of the right family, a missing type, one added to a
// non-chain thing, state numbers off by one, sorted, with `absent` left out, with a state added, and one repeated. Each must be refused. Controls that
// are true today: a database-only project compiles and carries no `solidity`, no `stateNumbers`, no store of kind chain.evm.
import { describe, expect, it } from "vitest";
import { solidityOf, solidityProblems } from "./chain-readers.ts";
import { CHAIN_BASE, DB_BASE, NOTE, compiles, type AnyModel, type Files } from "./chain-fixture.ts";

const WITH_NOTE: Files = { ...CHAIN_BASE, ...NOTE };

describe("controls: solidityProblems refuses each wrong model", () => {
  const field = (value: Record<string, unknown>, solidity?: string) => ({ value, ...(solidity === undefined ? {} : { solidity }) });
  const good = (): AnyModel => ({
    refusals: {}, values: {}, stores: { budgets: { kind: "chain.evm" } },
    things: {
      allowance: {
        store: "budgets", machine: { states: ["zeta", "alpha"] }, stateNumbers: { absent: 0, zeta: 1, alpha: 2 },
        fields: { id: field({ type: "id", prefix: "alw" }, "bytes32"), limit: field({ type: "uint", bits: 128 }, "uint128"), title: field({ type: "text", max: 9 }, "string"), who: field({ type: "account" }, "address") },
        events: { Spent: { amount: field({ type: "uint", bits: 8 }, "uint8") } }, errors: { Over: { fields: { left: field({ type: "uint", bits: 256 }, "uint256") } } },
      },
      ticket: { machine: null, fields: { id: field({ type: "id", prefix: "tkt" }) } },
    },
    operations: {
      "allowance.spend": { thing: "allowance", kind: "operation", refusals: [], allowed: [], payload: { amount: field({ type: "uint", bits: 16 }, "uint16") }, answer: { left: field({ type: "uint", bits: 16 }, "uint16") } },
      "allowance.get": { thing: "allowance", kind: "read", refusals: [], allowed: [], payload: {}, answer: { state: field({ type: "text", max: 64 }, "uint8") } },
      "ticket.open": { thing: "ticket", kind: "operation", refusals: [], allowed: [], payload: { title: field({ type: "text", max: 9 }) }, answer: {} },
    },
  } as unknown as AnyModel);
  const plant = (edit: (m: any) => void) => { const m = good() as any; edit(m); return solidityProblems(m as AnyModel); };
  it("accepts the right model", () => expect(solidityProblems(good())).toEqual([]));
  it("refuses one field wrong while the others are right, in each place a field is", () => {
    expect(plant((m) => { m.things.allowance.fields.limit.solidity = "uint256"; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.events.Spent.amount.solidity = "uint128"; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.errors.Over.fields.left.solidity = "uint255"; })).toHaveLength(1);
    expect(plant((m) => { m.operations["allowance.spend"].payload.amount.solidity = "uint8"; })).toHaveLength(1);
    expect(plant((m) => { m.operations["allowance.spend"].answer.left.solidity = "bytes32"; })).toHaveLength(1);
    expect(plant((m) => { m.operations["allowance.get"].answer.state.solidity = "string"; })).toHaveLength(1);
  });
  it("refuses a wrong type of each value kind, a missing one, a wider one and a null", () => {
    expect(plant((m) => { m.things.allowance.fields.id.solidity = "string"; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.fields.title.solidity = "bytes32"; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.fields.who.solidity = "bytes32"; })).toHaveLength(1);
    expect(plant((m) => { delete m.things.allowance.fields.limit.solidity; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.fields.limit.solidity = ["uint128"]; })).toHaveLength(1);
    expect(plant((m) => { m.things.allowance.fields.limit.solidity = null; })).toHaveLength(1);
  });
  it("refuses a chain thing or operation whose events, errors, payload or answer map is missing", () => {
    expect(plant((m) => { delete m.things.allowance.events; })).toHaveLength(1);
    expect(plant((m) => { delete m.things.allowance.errors; })).toHaveLength(1);
    expect(plant((m) => { delete m.operations["allowance.spend"].payload; })).toHaveLength(1);
    expect(plant((m) => { delete m.operations["allowance.spend"].answer; })).toHaveLength(1);
    expect(plant((m) => { delete m.things.allowance.fields; })).toHaveLength(1);
  });
  it("refuses a Solidity type on a thing that is not in a chain store, and on its operations", () => {
    expect(plant((m) => { m.things.ticket.fields.id.solidity = "bytes32"; })).toHaveLength(1);
    expect(plant((m) => { m.operations["ticket.open"].payload.title.solidity = "string"; })).toHaveLength(1);
    expect(plant((m) => { m.things.ticket.stateNumbers = { absent: 0 }; })).toHaveLength(1);
  });
  it("refuses state numbers that start at 0, are sorted, leave out absent, add a state, repeat a number, or are not there", () => {
    expect(plant((m) => { m.things.allowance.stateNumbers = { absent: 0, zeta: 0, alpha: 1 }; })).not.toEqual([]);
    expect(plant((m) => { m.things.allowance.stateNumbers = { absent: 0, alpha: 1, zeta: 2 }; })).not.toEqual([]);
    expect(plant((m) => { m.things.allowance.stateNumbers = { zeta: 1, alpha: 2 }; })).not.toEqual([]);
    expect(plant((m) => { m.things.allowance.stateNumbers = { absent: 0, zeta: 1, alpha: 2, gone: 3 }; })).not.toEqual([]);
    expect(plant((m) => { m.things.allowance.stateNumbers = { absent: 0, zeta: 1, alpha: 1 }; })).not.toEqual([]);
    expect(plant((m) => { delete m.things.allowance.stateNumbers; })).not.toEqual([]);
    expect(plant((m) => { m.things.allowance.stateNumbers = [0, 1, 2]; })).not.toEqual([]);
  });
  it("knows the Solidity type of each value kind", () => {
    expect([{ type: "uint", bits: 24 }, { type: "id", prefix: "x" }, { type: "text", max: 3 }, { type: "account" }, { type: "schema" }, { type: "money", bits: 128, signed: false }, { type: "money", bits: 64, signed: true }].map(solidityOf)).toEqual(["uint24", "bytes32", "string", "address", undefined, "uint128", "int64"]);
  });
});

describe("controls, true today: a database-only project", () => {
  it("compiles and carries no Solidity type, no state numbers and no chain store", () => {
    const m = compiles(DB_BASE);
    expect(solidityProblems(m)).toEqual([]);
    expect(Object.values(m.stores ?? {}).filter((s) => s.kind === "chain.evm")).toEqual([]);
    expect(JSON.stringify(m)).not.toContain("solidity");
    expect(JSON.stringify(m)).not.toContain("stateNumbers");
  });
});

describe("the chain store and what a thing in it compiles to", () => {
  it("Blueprint.store.chain.evm() makes a store of kind chain.evm, named by its file, and the thing lives in it", () => {
    const m = compiles(CHAIN_BASE);
    expect(m.stores?.["budgets"]?.kind).toBe("chain.evm");
    expect(m.stores?.["budgets"]?.file).toBe("blueprint/stores/budgets.ts");
    expect(m.things["allowance"]?.store).toBe("budgets");
  });
  it("Blueprint.account() is a value: named when wrapped, and the type of the accounts a thing keeps", () => {
    const m = compiles(CHAIN_BASE);
    expect(m.values["Recipient"]).toMatchObject({ type: "account" });
    for (const f of ["safe", "member", "token"]) expect(m.things["allowance"]?.fields[f]?.value, f).toMatchObject({ type: "account" });
    expect(m.operations["allowance.spend"]?.["payload"]).toMatchObject({ to: { value: { type: "account" }, named: "Recipient" } });
  });
  it("a chain-stored thing and a database thing live side by side, and only the first carries Solidity types", () => {
    const m = compiles({ ...CHAIN_BASE, ...DB_BASE });
    expect(m.things["allowance"]?.store).toBe("budgets");
    expect(m.things["ticket"]?.store).toBeUndefined();
    expect(solidityProblems(m)).toEqual([]);
    expect(JSON.stringify(m.things["ticket"])).not.toContain("solidity");
    expect(JSON.stringify(m.operations["ticket.open"])).not.toContain("solidity");
  });
});

describe("the Solidity type of each field", () => {
  it("allowance (the budgets shape): id bytes32, accounts address, amounts uint128, events, errors, payloads, answers and a read's state", () => {
    const m = compiles(CHAIN_BASE);
    const t = m.things["allowance"]!;
    expect(Object.fromEntries(Object.entries(t.fields).map(([k, f]) => [k, f.solidity]))).toEqual({ id: "bytes32", safe: "address", member: "address", token: "address", limit: "uint128", spent: "uint128" });
    const ops = m.operations as unknown as Record<string, { payload: Record<string, { solidity?: string }>; answer: Record<string, { solidity?: string }> }>;
    expect(Object.fromEntries(Object.entries(ops["allowance.spend"]!.payload).map(([k, f]) => [k, f.solidity]))).toEqual({ allowance: "bytes32", amount: "uint128", to: "address" });
    expect(Object.fromEntries(Object.entries(ops["allowance.spend"]!.answer).map(([k, f]) => [k, f.solidity]))).toEqual({ remaining: "uint128" });
    expect(Object.fromEntries(Object.entries(ops["allowance.grant"]!.answer).map(([k, f]) => [k, f.solidity]))).toEqual({ allowance: "bytes32" });
    expect(ops["allowance.get"]!.answer["state"]?.solidity).toBe("uint8");
    const events = t["events"] as Record<string, Record<string, { solidity?: string }>>;
    expect(events["AllowanceSpent"]?.["to"]?.solidity).toBe("address");
    expect(events["AllowanceSpent"]?.["amount"]?.solidity).toBe("uint128");
    expect((t["errors"] as Record<string, { fields: Record<string, { solidity?: string }> }>)["AllowanceExceeded"]?.fields["remaining"]?.solidity).toBe("uint128");
  });
  it("note: its events, its operation's payload and answer are in the model with every field typed (a model that leaves a map out is not judged by what it left)", () => {
    const m = compiles(WITH_NOTE);
    const note = m.things["note"] as unknown as { events: Record<string, Record<string, { solidity?: string }>>; errors: Record<string, unknown> };
    expect(Object.keys(note.events).sort()).toEqual(["NotePassed", "NoteSettled", "NoteWritten"]);
    expect(Object.fromEntries(Object.entries(note.events["NoteWritten"]!).map(([k, f]) => [k, f.solidity]))).toEqual({ note: "bytes32", body: "string" });
    expect(Object.keys(note.errors)).toEqual([]);
    const write = m.operations["note.write"] as unknown as { payload: Record<string, { solidity?: string }>; answer: Record<string, { solidity?: string }> };
    expect(Object.fromEntries(Object.entries(write.payload).map(([k, f]) => [k, f.solidity]))).toEqual({ allowance: "bytes32", body: "string" });
    expect(Object.fromEntries(Object.entries(write.answer).map(([k, f]) => [k, f.solidity]))).toEqual({ note: "bytes32" });
  });
  it("every size of uint, text and an id: uint8 to uint256, string, bytes32, address", () => {
    const m = compiles(WITH_NOTE);
    expect(Object.fromEntries(Object.entries(m.things["note"]!.fields).map(([k, f]) => [k, f.solidity]))).toEqual({
      id: "bytes32", allowance: "bytes32", n8: "uint8", n16: "uint16", n32: "uint32", n64: "uint64", n256: "uint256", body: "string", by: "address",
    });
  });
  it("every field in the model has the type its own value says it works out to", () => {
    for (const files of [CHAIN_BASE, WITH_NOTE]) {
      const problems = solidityProblems(compiles(files));
      expect(problems, problems.join("\n")).toEqual([]);
    }
  });
});

describe("the states' numbers on chain", () => {
  it("allowance: absent is 0, then active, exhausted, revoked from 1", () => {
    expect(compiles(CHAIN_BASE).things["allowance"]?.stateNumbers).toEqual({ absent: 0, active: 1, exhausted: 2, revoked: 3 });
  });
  it("note: the declaration's order (zeta, alpha, mid), not the alphabet's", () => {
    expect(compiles(WITH_NOTE).things["note"]?.stateNumbers).toEqual({ absent: 0, zeta: 1, alpha: 2, mid: 3 });
  });
});
