// Goal 4, slice 3 (M6.10), sixth check: `blueprint/refusals.lock`, written by `ortho generate` in its exact schema, and read back by the model
// (`design/decisions/M6-chain.md` item 4). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a plain database project (a thing `ticket`, code TK, with two declared errors; the lock holds every refusal of the project, whatever
// language raises it, so it needs no chain), with the real `ortho`:
//   - `ortho model` and `ortho check` write no lock; `ortho generate` writes `blueprint/refusals.lock`, and `lockProblems` (`chain-readers.ts`: the schema of item 4
//     word for word: `generated`, `lockVersion` 1, `refusals` by code in order, `retired`; each entry `name`, `owner`, `from` only for a declared error, `fields`,
//     `wire.effect.tag`, `earlier`; the selector, where there is a Solidity wire, the keccak of its signature; no other key) finds nothing wrong;
//   - the first lock holds exactly today's refusals, each with its entry: AR-001 NotAllowed and AR-002 IdempotencyConflict (owner `runtime`, no `from`),
//     TK-001 TicketTooBig and TK-002 TicketBusy (owner `ticket`, `from` `blueprint/things/ticket/errors.ts`, the fields' values), TK-900 TicketNotOpen and TK-901
//     TicketNotFound (owner `ticket`, no `from`); `retired` is empty; every `earlier` is empty; no `wire.solidity`, since no chain store raises these;
//   - generate again changes nothing: the lock byte for byte, and every file of `generated/`;
//   - the model's `refusals` map is read from the lock: after the lock is edited to give TicketBusy TK-007, `ortho model` says TK-007 for it, in `refusals` and on
//     the thing's error, and TicketTooBig keeps TK-001 (a model that numbered the errors itself would say TK-002);
//   - `ortho check` passes on the project generate just wrote (the lock is not drift), exit 0, and reports no change.
// Where the schema's chain half is judged (the Solidity wire of a chain-raised refusal, `earlier` after a field changes): `05-m6-11-lock-chain-wire.test.ts`.
// The lock's evolution (swap, add, rename, retire): `04-m6-10-lock-codes.test.ts`.
//
// THE CONTROLS plant a wrong lock against `lockProblems`, one change each: an extra or a missing key at the top, in an entry and in a wire; a version other than 1;
// a header that is not a "Generated from ... Do not edit." line; refusals out of code order; a selector that is not the keccak of its signature (and the reader's
// keccak against the known selectors of `transfer(address,uint256)` and of `Error(string)`); a tag that is not the name; `earlier` not a list; a field value of a
// wrong shape; one name twice; a retired code that is also live; text that is not two-space JSON with a newline. The right lock passes.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lockProblems } from "./chain-readers.ts";
import { DB_BASE, projectOf, run, selectorOf } from "./chain-fixture.ts";

const LOCK = "blueprint/refusals.lock";
const lines = (o: unknown) => `${JSON.stringify(o, null, 2)}\n`;
const effect = (tag: string) => ({ effect: { tag } });
const runtime = (name: string) => ({ name, owner: "runtime", fields: {}, wire: effect(name), earlier: [] });
const GOOD = () => ({
  generated: "Generated from blueprint/. Append-only. Do not edit.",
  lockVersion: 1,
  refusals: {
    "AR-001": runtime("NotAllowed"),
    "AR-002": runtime("IdempotencyConflict"),
    "TK-001": { name: "TicketTooBig", owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields: { cap: { value: "uint", bits: 64 } }, wire: { ...effect("TicketTooBig"), solidity: { signature: "TicketTooBig(uint64)", selector: selectorOf("TicketTooBig(uint64)") } }, earlier: [{ ...effect("TicketTooBig") }] },
    "TK-900": { name: "TicketNotOpen", owner: "ticket", fields: {}, wire: effect("TicketNotOpen"), earlier: [] },
  },
  retired: { "TK-002": { name: "TicketBusy", owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields: { why: { value: "text", max: 9 }, who: { value: "account" }, which: { value: "id", prefix: "tkt" } }, wire: effect("TicketBusy"), earlier: [] } },
});

describe("controls: lockProblems refuses each wrong lock", () => {
  const OPTS = { prefixes: { ticket: "TK" }, solidity: true };
  const plant = (edit: (l: any) => void, text?: (l: any) => string) => { const l = GOOD() as any; edit(l); return lockProblems(text ? text(l) : lines(l), OPTS); };
  it("accepts the right lock", () => expect(lockProblems(lines(GOOD()), OPTS)).toEqual([]));
  it("knows the keccak selectors it judges with", () => {
    expect(selectorOf("transfer(address,uint256)")).toBe("0xa9059cbb");
    expect(selectorOf("Error(string)")).toBe("0x08c379a0");
  });
  it("refuses a key too many or too few: at the top, in an entry, in a wire, in a solidity wire, in a field value", () => {
    expect(plant((l) => { l.extra = 1; })).toHaveLength(1);
    expect(plant((l) => { delete l.retired; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].extra = 1; })).toHaveLength(1);
    expect(plant((l) => { delete l.refusals["TK-001"].owner; })).not.toEqual([]);
    expect(plant((l) => { delete l.refusals["TK-001"].earlier; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].wire.other = {}; })).toHaveLength(1);
    expect(plant((l) => { delete l.refusals["TK-001"].wire.effect; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].wire.solidity.abi = []; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap.extra = 1; })).toHaveLength(1);
    expect(plant((l) => { delete l.refusals["TK-001"].fields.cap.bits; })).not.toEqual([]);
  });
  it("refuses a version that is not 1 (a string, 2, missing), and a header that is not the generated line", () => {
    expect(plant((l) => { l.lockVersion = 2; })).toHaveLength(1);
    expect(plant((l) => { l.lockVersion = "1"; })).toHaveLength(1);
    expect(plant((l) => { l.generated = "Do not edit."; })).toHaveLength(1);
    expect(plant((l) => { l.generated = "Generated from blueprint/. Append-only."; })).toHaveLength(1);
  });
  it("refuses refusals out of code order, and a key that is no code", () => {
    expect(plant((l) => { l.refusals = { "TK-900": l.refusals["TK-900"], "AR-001": l.refusals["AR-001"], "TK-001": l.refusals["TK-001"] }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals = { ...l.refusals, "tk-5": runtime("Lower") }; }).length).toBeGreaterThan(0);
  });
  it("refuses a selector that is not the keccak of its signature, and a signature that is not of the name", () => {
    expect(plant((l) => { l.refusals["TK-001"].wire.solidity.selector = "0x00000000"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].wire.solidity.signature = "TicketTooBig(uint128)"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].wire.solidity = { signature: "Other(uint64)", selector: selectorOf("Other(uint64)") }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].earlier[0].solidity = { signature: "TicketTooBig()", selector: "0x12345678" }; })).toHaveLength(1);
  });
  it("refuses a tag that is not the name, an earlier that is not a list or holds an empty identity, a field value of a wrong shape", () => {
    expect(plant((l) => { l.refusals["TK-001"].wire.effect.tag = "TicketBig"; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].earlier = {}; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].earlier = [{}]; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "bigint" }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 128, signed: false, asset: { field: "token" } }; })).toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 128, signed: false, asset: { field: "token", token: "usdc" } }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 128, asset: { token: "usdc" } }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 128, signed: false, asset: { coin: "usdc" } }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "uint", bits: "64" }; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].from = 7; })).toHaveLength(1);
  });
  it("refuses one name twice and a retired code that is also live", () => {
    expect(plant((l) => { l.refusals["TK-900"].name = "TicketTooBig"; l.refusals["TK-900"].wire.effect.tag = "TicketTooBig"; })).toHaveLength(1);
    expect(plant((l) => { l.retired["TK-001"] = l.retired["TK-002"]; })).toHaveLength(1);
  });
  it("refuses an owner unrelated to its code's prefix, a runtime code under a made-up name, and an owner that does not fit the code's kind", () => {
    expect(plant((l) => { l.refusals["TK-001"].owner = "other"; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["TK-001"].owner = "other"; l.refusals["TK-001"].from = "blueprint/things/other/errors.ts"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].owner = "runtime"; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["AR-001"].owner = "ticket"; })).not.toEqual([]);
    expect(plant((l) => { l.refusals["AR-001"].name = "Banana"; l.refusals["AR-001"].wire.effect.tag = "Banana"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["AR-002"] = runtime("NotAllowed"); })).not.toEqual([]);
  });
  it("refuses a money asset name that is no file name, and a `from` that is another thing's errors.ts", () => {
    for (const bad of ["US DC", "USDC", "", "1usdc"]) expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 64, signed: false, asset: { token: bad } }; }), bad).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].from = "blueprint/things/other/errors.ts"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].from = "blueprint/things/ticket/thing.ts"; })).toHaveLength(1);
  });
  it("refuses `from` where it does not belong, and its absence where it does", () => {
    expect(plant((l) => { delete l.refusals["TK-001"].from; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["AR-001"].from = "blueprint/things/ticket/errors.ts"; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-900"].from = "blueprint/things/ticket/errors.ts"; })).toHaveLength(1);
    expect(plant((l) => { delete l.retired["TK-002"].from; })).toHaveLength(1);
  });
  it("refuses a value out of its range: an empty id prefix, uint or money bits that are no width, text with a max below 1", () => {
    expect(plant((l) => { l.retired["TK-002"].fields.which.prefix = ""; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap.bits = 7; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap.bits = 264; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].fields.cap = { value: "money", bits: 12, signed: false, asset: { token: "usdc" } }; })).toHaveLength(1);
    expect(plant((l) => { l.retired["TK-002"].fields.why.max = -1; })).toHaveLength(1);
    expect(plant((l) => { l.retired["TK-002"].fields.why.max = 0; })).toHaveLength(1);
  });
  it("refuses a retired name that is also a live one, and a Solidity wire in a lock no chain store raises into", () => {
    expect(plant((l) => { l.retired["TK-002"].name = "TicketTooBig"; l.retired["TK-002"].wire.effect.tag = "TicketTooBig"; })).not.toEqual([]);
    const l = GOOD() as any;
    expect(lockProblems(lines(l), { prefixes: { ticket: "TK" }, solidity: false })).toHaveLength(1);
  });
  it("refuses an earlier identity whose tag and signature are of two names, whose tag is no name, or whose signature is none", () => {
    expect(plant((l) => { l.refusals["TK-001"].earlier = [{ effect: { tag: "A" }, solidity: { signature: "B()", selector: selectorOf("B()") } }]; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].earlier = [{ effect: { tag: "not a name" } }]; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].earlier = [{ solidity: { signature: "nope", selector: "0x00000000" } }]; })).toHaveLength(1);
    expect(plant((l) => { l.refusals["TK-001"].earlier = [{ effect: { tag: "TicketTooBig" }, solidity: { signature: "TicketTooBig()", selector: selectorOf("TicketTooBig()") } }]; })).toEqual([]);
  });
  it("refuses text that is not two-space JSON with a closing newline, and text that is not JSON", () => {
    expect(plant(() => {}, (l) => JSON.stringify(l, null, 2))).toHaveLength(1);
    expect(plant(() => {}, (l) => `${JSON.stringify(l, null, "\t")}\n`)).toHaveLength(1);
    expect(plant(() => {}, (l) => JSON.stringify(l))).toHaveLength(1);
    expect(lockProblems("not json")).toHaveLength(1);
  });
});

/** The files of a folder, by path, with their bytes: what "changes nothing" is judged against. */
const snapshot = (root: string, dir = ""): Readonly<Record<string, string>> =>
  Object.fromEntries(readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => d.isDirectory() ? Object.entries(snapshot(root, join(dir, d.name))) : [[join(dir, d.name), readFileSync(join(root, dir, d.name), "utf8")]]));
const read = (root: string) => JSON.parse(readFileSync(join(root, LOCK), "utf8")) as { refusals: Record<string, any>; retired: Record<string, unknown> };
const names = (lock: { refusals: Record<string, { name: string }> }) => Object.fromEntries(Object.entries(lock.refusals).map(([code, e]) => [e.name, code]));

describe("ortho generate writes blueprint/refusals.lock", () => {
  it("model and check write no lock; generate writes one in the exact schema, holding exactly today's refusals", () => {
    const p = projectOf(DB_BASE);
    try {
      run(p.root, "model", "--json");
      run(p.root, "check");
      expect(existsSync(join(p.root, LOCK)), "ortho model or ortho check wrote the lock: only generate does").toBe(false);
      const g = run(p.root, "generate");
      expect(g.status, g.err + g.out.slice(-800)).toBe(0);
      expect(existsSync(join(p.root, LOCK)), "ortho generate wrote no blueprint/refusals.lock").toBe(true);
      const text = readFileSync(join(p.root, LOCK), "utf8");
      expect(lockProblems(text, { prefixes: { ticket: "TK" }, solidity: false }), lockProblems(text, { prefixes: { ticket: "TK" }, solidity: false }).join("\n")).toEqual([]);
      const lock = read(p.root);
      expect(lock.retired).toEqual({});
      expect(Object.keys(lock.refusals)).toEqual(["AR-001", "AR-002", "TK-001", "TK-002", "TK-900", "TK-901"]);
      expect(lock.refusals["AR-001"]).toEqual(runtime("NotAllowed"));
      expect(lock.refusals["AR-002"]).toEqual(runtime("IdempotencyConflict"));
      expect(lock.refusals["TK-001"]).toEqual({ name: "TicketTooBig", owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields: { cap: { value: "uint", bits: 64 } }, wire: effect("TicketTooBig"), earlier: [] });
      expect(lock.refusals["TK-002"]).toEqual({ name: "TicketBusy", owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields: {}, wire: effect("TicketBusy"), earlier: [] });
      for (const [code, name] of [["TK-900", "TicketNotOpen"], ["TK-901", "TicketNotFound"]] as const) {
        expect(lock.refusals[code], code).toMatchObject({ name, owner: "ticket", wire: effect(name), earlier: [] });
        expect(lock.refusals[code], `${code} is generated, so it has no file it is declared in`).not.toHaveProperty("from");
      }
    } finally { p.remove(); }
  });

  it("generating again changes nothing: the lock byte for byte, and every file of generated/", () => {
    const p = projectOf(DB_BASE);
    try {
      expect(run(p.root, "generate").status).toBe(0);
      const lock = readFileSync(join(p.root, LOCK), "utf8");
      const before = snapshot(join(p.root, "generated"));
      expect(Object.keys(before).length).toBeGreaterThan(5);
      expect(run(p.root, "generate").status).toBe(0);
      expect(readFileSync(join(p.root, LOCK), "utf8")).toBe(lock);
      expect(snapshot(join(p.root, "generated"))).toEqual(before);
    } finally { p.remove(); }
  });

  it("the model's refusals map is read from the lock: a lock that says TicketBusy is TK-007 makes the model say so", () => {
    const p = projectOf(DB_BASE);
    try {
      expect(run(p.root, "generate").status).toBe(0);
      const fromLock = run(p.root, "model", "--json");
      const model = JSON.parse(fromLock.out) as { refusals: Record<string, string>; things: { ticket: { errors: Record<string, { code: string }> } } };
      expect(model.refusals).toEqual(names(read(p.root)));
      // The lock as a merge or a hand might leave it: the same entry under another code. A model that counted the errors itself would still say TK-002.
      const lock = read(p.root);
      const moved = { ...lock, refusals: Object.fromEntries(Object.entries(lock.refusals).filter(([c]) => c !== "TK-002").concat([["TK-007", lock.refusals["TK-002"]]]).sort(([a], [b]) => (a < b ? -1 : 1))) };
      writeFileSync(join(p.root, LOCK), lines(moved));
      const after = JSON.parse(run(p.root, "model", "--json").out) as typeof model;
      expect(after.refusals["TicketBusy"]).toBe("TK-007");
      expect(after.things.ticket.errors["TicketBusy"]?.code).toBe("TK-007");
      expect(after.refusals["TicketTooBig"]).toBe("TK-001");
      expect(Object.values(after.refusals)).not.toContain("TK-002");
    } finally { p.remove(); }
  });

  it("ortho check passes on what generate wrote, lock included, and reports no change", () => {
    const p = projectOf(DB_BASE);
    try {
      expect(run(p.root, "generate").status).toBe(0);
      const c = run(p.root, "check");
      expect(c.status, c.out).toBe(0);
      expect(c.out).toContain("check ✔");
      expect(c.out).not.toMatch(/\b(major|minor)\b/i);
    } finally { p.remove(); }
  });
});
