// Goal 4, slice 3 (M6.10), seventh check: a refusal keeps its code (`design/decisions/M6-chain.md` item 4). Today a code is its thing's prefix and the error's
// place in `errors.ts` (`describe.ts:107`), so reordering two errors swaps their codes on every language. Written by the checks author; a builder never edits this
// file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On the plain database project of `chain-fixture.ts` (a thing `ticket`, prefix TK; TicketTooBig is TK-001 and TicketBusy TK-002 in the first lock),
// each case runs `ortho generate` for the first lock, changes the blueprint, runs `ortho generate` again, and reads `blueprint/refusals.lock` and the model:
//   - swapping the two declared errors in `errors.ts` keeps both codes, and both entries are as they were;
//   - a new error declared first, in the middle, or last takes the thing's next unused number, TK-003, and the others keep theirs; two new errors take TK-003 and
//     TK-004 in declaration order;
//   - an error that leaves the blueprint moves to `retired`, as it was, and is gone from `refusals`; a new error after that takes the next number (TK-003), never
//     the retired TK-002;
//   - renaming a declared error is a new code: the new name takes TK-003, the old TK-002 is retired (as it was), and the next new error takes TK-004;
//   - changing an error's field keeps its code and updates its entry's fields; nothing is retired;
//   - renaming the thing's first state renames its machine refusal (TicketNotOpen to TicketNotFresh) and keeps TK-900, since it is the thing's own slot; the old wire
//     identity (`effect.tag` TicketNotOpen) moves to `earlier`, and nothing is retired.
// In each, the model's `refusals` map says the same as the lock (name to code, every entry of `refusals` and no retired one), and the lock passes `lockProblems`.
// (That `ortho check` calls the rename and the state change major is judged in `04-m6-10-check-reports-major.test.ts`.)
//
// THE CONTROLS: `evolve` below reads only the lock and the model; the lock's reader is planted in `04-m6-10-refusals-lock.test.ts` (`lockProblems`) and the model's
// agreement with it here, by `agrees`, which refuses a model that disagrees with its lock by one code, one name added, one left out, or a retired code kept live.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lockProblems } from "./chain-readers.ts";
import { DB_BASE, projectOf, put, run, swap, type Files } from "./chain-fixture.ts";

type Entry = { name: string; owner: string; from?: string; fields: Record<string, unknown>; wire: { effect: { tag: string } }; earlier: Array<{ effect?: { tag: string } }> };
type Lock = { refusals: Record<string, Entry>; retired: Record<string, Entry> };
const ERRORS = "things/ticket/errors.ts";
const OPEN = "things/ticket/verbs/open.ts";

const codes = (lock: Lock) => Object.fromEntries(Object.entries(lock.refusals).map(([code, e]) => [e.name, code]));
/** What is wrong with a model's refusals against its lock: a code that differs, a name that is in only one, or a retired code still live. */
const agrees = (model: { refusals: Record<string, string> }, lock: Lock): ReadonlyArray<string> => {
  const want = codes(lock);
  const retired = Object.keys(lock.retired);
  return [
    ...Object.entries(want).filter(([n, c]) => model.refusals[n] !== c).map(([n, c]) => `${n}: the model says ${String(model.refusals[n])}, the lock ${c}`),
    ...Object.keys(model.refusals).filter((n) => !(n in want)).map((n) => `${n} is in the model but not in the lock's refusals`),
    ...Object.values(model.refusals).filter((c) => retired.includes(c)).map((c) => `${c} is retired in the lock but live in the model`),
  ];
};

describe("controls: agrees refuses a model that differs from its lock", () => {
  const lock = (): Lock => ({ refusals: { "TK-001": { name: "A", owner: "t", fields: {}, wire: { effect: { tag: "A" } }, earlier: [] }, "TK-003": { name: "C", owner: "t", fields: {}, wire: { effect: { tag: "C" } }, earlier: [] } }, retired: { "TK-002": { name: "B", owner: "t", fields: {}, wire: { effect: { tag: "B" } }, earlier: [] } } });
  it("accepts the same", () => expect(agrees({ refusals: { A: "TK-001", C: "TK-003" } }, lock())).toEqual([]));
  it("refuses one code different, a name added, a name left out, and a retired code live", () => {
    expect(agrees({ refusals: { A: "TK-002", C: "TK-003" } }, lock())).not.toEqual([]);
    expect(agrees({ refusals: { A: "TK-001", C: "TK-003", D: "TK-004" } }, lock())).not.toEqual([]);
    expect(agrees({ refusals: { A: "TK-001" } }, lock())).not.toEqual([]);
    expect(agrees({ refusals: { A: "TK-001", C: "TK-003", B: "TK-002" } }, lock())).not.toEqual([]);
  });
});

/** Generate the base, change it with `change`, generate again: the lock before and after, and the model after. */
const evolve = (change: (files: Files) => Files, again?: (files: Files) => Files) => {
  const p = projectOf(DB_BASE);
  try {
    const gen = (label: string) => { const g = run(p.root, "generate"); expect(g.status, `${label}: ${g.err}${g.out.slice(-600)}`).toBe(0); };
    const lockNow = (): Lock => {
      const path = join(p.root, "blueprint/refusals.lock");
      expect(existsSync(path), "ortho generate wrote no blueprint/refusals.lock").toBe(true);
      return JSON.parse(readFileSync(path, "utf8")) as Lock;
    };
    const write = (files: Files) => { for (const [f, t] of Object.entries(files)) if (t !== null && t !== DB_BASE[f]) writeFileSync(join(p.root, "blueprint", f), t); };
    gen("first generate");
    const first = lockNow();
    let files = change(DB_BASE);
    write(files); gen("generate after the change");
    const second = lockNow();
    let third: Lock | undefined;
    if (again) { files = again(files); write(files); gen("generate after the second change"); third = lockNow(); }
    const last = third ?? second;
    const model = JSON.parse(run(p.root, "model", "--json").out) as { refusals: Record<string, string>; things: { ticket: { errors: Record<string, { code: string }>; machine: { notFrom: { error: string; code: string } } } } };
    expect(agrees(model, last), agrees(model, last).join("\n")).toEqual([]);
    expect(lockProblems(readFileSync(join(p.root, "blueprint/refusals.lock"), "utf8"), { prefixes: { ticket: "TK" }, solidity: false })).toEqual([]);
    return { first, second, third, model };
  } finally { p.remove(); }
};

const TOO_BIG = "export class TicketTooBig extends Blueprint.error({ cap: Cap }, { exit: 10 }) {}";
const BUSY = "export class TicketBusy extends Blueprint.error({}, { exit: 11 }) {}";
const errorsFile = (...classesIn: ReadonlyArray<string>): string => `import { Blueprint } from "orthograph";\nimport { Cap } from "../../values/amounts.ts";\n\n${classesIn.join("\n")}\n`;
/** The whole entry a new declared error of `ticket` gets: nothing else may sit in it (a wrong owner, a wrong file, junk in earlier). */
const decl = (name: string, fields: Record<string, unknown> = {}) => ({ name, owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields, wire: { effect: { tag: name } }, earlier: [] });
const NEW = (n: string, exit: number) => `export class ${n} extends Blueprint.error({}, { exit: ${exit} }) {}`;

describe("a refusal keeps its code when the blueprint changes", () => {
  it("swapping the two declared errors keeps both codes, and both entries as they were", () => {
    const r = evolve((f) => put(f, ERRORS, errorsFile(BUSY, TOO_BIG)));
    expect(codes(r.second)).toEqual({ ...codes(r.first) });
    expect(r.second.refusals["TK-001"]).toEqual(r.first.refusals["TK-001"]);
    expect(r.second.refusals["TK-002"]).toEqual(r.first.refusals["TK-002"]);
    expect(r.model.refusals).toMatchObject({ TicketTooBig: "TK-001", TicketBusy: "TK-002" });
    expect(r.model.things.ticket.errors).toMatchObject({ TicketTooBig: { code: "TK-001" }, TicketBusy: { code: "TK-002" } });
  });
  for (const [where, classesIn] of [["first", [NEW("TicketLate", 12), TOO_BIG, BUSY]], ["in the middle", [TOO_BIG, NEW("TicketLate", 12), BUSY]], ["last", [TOO_BIG, BUSY, NEW("TicketLate", 12)]]] as const) {
    it(`a new error declared ${where} takes TK-003; the others keep theirs`, () => {
      const r = evolve((f) => put(f, ERRORS, errorsFile(...classesIn)));
      expect(codes(r.second)).toEqual({ ...codes(r.first), TicketLate: "TK-003" });
      expect(r.second.refusals["TK-001"]).toEqual(r.first.refusals["TK-001"]);
      expect(r.second.refusals["TK-002"]).toEqual(r.first.refusals["TK-002"]);
      expect(r.second.retired).toEqual({});
      expect(r.second.refusals["TK-003"]).toEqual(decl("TicketLate"));
    });
  }
  it("two new errors at once take TK-003 and TK-004 in declaration order", () => {
    const r = evolve((f) => put(f, ERRORS, errorsFile(NEW("TicketOver", 13), TOO_BIG, NEW("TicketLate", 12), BUSY)));
    expect(codes(r.second)).toMatchObject({ TicketTooBig: "TK-001", TicketBusy: "TK-002", TicketOver: "TK-003", TicketLate: "TK-004" });
    expect(r.second.refusals["TK-003"]).toEqual(decl("TicketOver"));
    expect(r.second.refusals["TK-004"]).toEqual(decl("TicketLate"));
  });
});

describe("an error that leaves the blueprint is retired, and its code is never given again", () => {
  const without = (f: Files): Files => swap(swap(put(f, ERRORS, errorsFile(TOO_BIG)), OPEN, "errors: [TicketTooBig, TicketBusy],", "errors: [TicketTooBig],"), OPEN, "import { TicketTooBig, TicketBusy } from", "import { TicketTooBig } from");
  it("a removed error moves to retired as it was; a new error after that takes TK-003, not the retired TK-002", () => {
    const r = evolve(without, (f) => put(f, ERRORS, errorsFile(TOO_BIG, NEW("TicketLate", 12))));
    expect(r.second.refusals["TK-002"]).toBeUndefined();
    expect(r.second.retired["TK-002"]).toEqual(r.first.refusals["TK-002"]);
    expect(codes(r.second)).not.toHaveProperty("TicketBusy");
    expect(codes(r.third!)).toMatchObject({ TicketTooBig: "TK-001", TicketLate: "TK-003" });
    expect(r.third!.refusals["TK-003"]).toEqual(decl("TicketLate"));
    expect(r.third!.retired["TK-002"]).toEqual(r.first.refusals["TK-002"]);
    expect(Object.values(r.model.refusals)).not.toContain("TK-002");
  });
});

describe("renaming a declared error is a new code: the new name takes the next number and the old one is retired", () => {
  const renamed = (f: Files): Files => swap(swap(put(f, ERRORS, errorsFile(TOO_BIG, "export class TicketStuck extends Blueprint.error({}, { exit: 11 }) {}")), OPEN, "import { TicketTooBig, TicketBusy } from", "import { TicketTooBig, TicketStuck } from"), OPEN, "errors: [TicketTooBig, TicketBusy],", "errors: [TicketTooBig, TicketStuck],");
  it("TicketBusy becomes TicketStuck: TK-003 for it, TK-002 retired as it was, and the next new error takes TK-004", () => {
    const r = evolve(renamed, (f) => put(f, ERRORS, errorsFile(TOO_BIG, "export class TicketStuck extends Blueprint.error({}, { exit: 11 }) {}", NEW("TicketLate", 12))));
    expect(codes(r.second)).toMatchObject({ TicketTooBig: "TK-001", TicketStuck: "TK-003" });
    expect(r.second.refusals["TK-003"]).toEqual(decl("TicketStuck"));
    expect(codes(r.second)).not.toHaveProperty("TicketBusy");
    expect(r.second.retired["TK-002"]).toEqual(r.first.refusals["TK-002"]);
    expect(r.second.refusals["TK-002"]).toBeUndefined();
    expect(codes(r.third!)).toMatchObject({ TicketStuck: "TK-003", TicketLate: "TK-004" });
    expect(r.third!.refusals["TK-004"]).toEqual(decl("TicketLate"));
  });
});

describe("changing an error's field keeps its code", () => {
  it("TicketBusy gains a field: still TK-002, its entry's fields updated, nothing retired", () => {
    const r = evolve((f) => put(f, ERRORS, errorsFile(TOO_BIG, "export class TicketBusy extends Blueprint.error({ cap: Cap }, { exit: 11 }) {}")));
    expect(codes(r.second)).toEqual(codes(r.first));
    expect(r.second.refusals["TK-002"]).toEqual(decl("TicketBusy", { cap: { value: "uint", bits: 64 } }));
    expect(r.second.refusals["TK-002"]?.name).toBe("TicketBusy");
    expect(r.second.retired).toEqual({});
    expect(r.second.refusals["TK-001"]).toEqual(r.first.refusals["TK-001"]);
  });
});

describe("renaming the machine's first state keeps the machine refusal's code and moves the old identity to earlier", () => {
  it("open becomes fresh: TicketNotOpen is TicketNotFresh, still TK-900, with the old tag in earlier, and nothing retired", () => {
    const rename = (f: Files): Files => {
      const machine = f["things/ticket/machine.ts"]!.replace('states: ["open", "closed"]', 'states: ["fresh", "closed"]').replace('open: { from: [], to: "open"', 'open: { from: [], to: "fresh"').replace('close: { from: ["open"]', 'close: { from: ["fresh"]');
      return put(f, "things/ticket/machine.ts", machine);
    };
    const r = evolve(rename);
    expect(r.first.refusals["TK-900"]?.name).toBe("TicketNotOpen");
    expect(r.second.refusals["TK-900"]).toEqual({ name: "TicketNotFresh", owner: "ticket", fields: r.first.refusals["TK-900"]!.fields, wire: { effect: { tag: "TicketNotFresh" } }, earlier: [{ effect: { tag: "TicketNotOpen" } }] });
    expect(r.second.refusals["TK-900"]?.earlier).toEqual([{ effect: { tag: "TicketNotOpen" } }]);
    expect(r.second.retired).toEqual({});
    expect(r.model.refusals).toMatchObject({ TicketNotFresh: "TK-900" });
    expect(r.model.refusals).not.toHaveProperty("TicketNotOpen");
    expect(r.model.things.ticket.machine.notFrom).toMatchObject({ error: "TicketNotFresh", code: "TK-900" });
  });
});

describe("the lock, not the last generated model, keeps the codes", () => {
  it("a lock that says TicketBusy is TK-007, with generated/ deleted, is kept by the next generate", () => {
    const p = projectOf(DB_BASE);
    try {
      expect(run(p.root, "generate").status).toBe(0);
      const path = join(p.root, "blueprint/refusals.lock");
      const lock = JSON.parse(readFileSync(path, "utf8")) as Lock;
      const moved = Object.fromEntries(Object.entries(lock.refusals).filter(([c]) => c !== "TK-002").concat([["TK-007", lock.refusals["TK-002"]!]]).sort(([a], [b]) => (a < b ? -1 : 1)));
      writeFileSync(path, `${JSON.stringify({ ...lock, refusals: moved }, null, 2)}\n`);
      rmSync(join(p.root, "generated"), { recursive: true, force: true });
      const g = run(p.root, "generate");
      expect(g.status, g.err + g.out.slice(-500)).toBe(0);
      const after = JSON.parse(readFileSync(path, "utf8")) as Lock;
      expect(codes(after)).toMatchObject({ TicketTooBig: "TK-001", TicketBusy: "TK-007" });
      expect(after.refusals["TK-002"]).toBeUndefined();
      const model = JSON.parse(run(p.root, "model", "--json").out) as { refusals: Record<string, string> };
      expect(model.refusals["TicketBusy"]).toBe("TK-007");
    } finally { p.remove(); }
  });
});

describe("controls, true today: the code is the declaration's place until a lock keeps it", () => {
  it("a project's first generate numbers the errors in declaration order, as describe.ts does", () => {
    const p = projectOf(DB_BASE);
    try {
      const m = JSON.parse(run(p.root, "model", "--json").out) as { refusals: Record<string, string> };
      expect(m.refusals).toMatchObject({ TicketTooBig: "TK-001", TicketBusy: "TK-002", TicketNotOpen: "TK-900", TicketNotFound: "TK-901", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" });
    } finally { p.remove(); }
  });
});
