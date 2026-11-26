// #1134 (CX-feature-ownership): the compiler refuses a feature writing a thing another feature owns, by every way a feature writes: a database
// step that names it, a verb the feature adds to the other's thing that creates, moves or changes it, the keeper's move, a reaction to an event,
// and an operation run inside another's commit. Each refusal is judged word for word against call 6's sentence, built from the fixture
// (`refusal`): the file, the writing feature, the operation, every way it writes, the thing, the feature that owns it, and every operation of
// the owner that writes it, sorted, to run inside the commit instead (gap 1, `Blueprint.step.operation`). What passes is ownership.test.ts; the
// scratch books are ./ownership-testing.ts. Written by the checks author for Goal 16; the builder never edits this file and only removes lines
// from `expected-failing/ownership-refused.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint, type Step } from "orthograph";
import {
  ENTRY_WRITERS, LINE_WRITERS, MOUNTED, SLIP_WRITERS, at, books, file, innerStep, modelExit, operation, problemsOf, refusal, type AppSpec, type Books, type Name, type Refusal,
} from "./ownership-testing.ts";

/** Every problem naming `where`, of a blueprint that must be refused. */
const namedAt = async (exit: ReturnType<typeof modelExit>, where: string) => {
  const problems = problemsOf(await exit);
  expect(problems.length, "the blueprint is refused").toBeGreaterThan(0);
  return { problems, named: problems.filter((p) => p.includes(where)) };
};

/** The blueprint is refused, and the problems naming the file are exactly `want`, word for word, in any order. */
const refusedWith = async (exit: ReturnType<typeof modelExit>, pkg: Name, path: string, ...want: ReadonlyArray<string>) => {
  const { problems, named } = await namedAt(exit, at(pkg, path));
  expect([...named].sort(), `the problems naming ${at(pkg, path)} are, word for word:\n${[...want].sort().join("\n")}\nAll of them were:\n${problems.join("\n")}`).toEqual([...want].sort());
};

/** Payroll's refusal of a write to the ledger's line, under the mounts' own names. */
const line = (path: string, operation: string, how: ReadonlyArray<string>): Refusal =>
  ({ mount: "payroll", pkg: "payroll", path, feature: "payroll", operation, how, thing: "gl-entry", owner: "ledger", offers: LINE_WRITERS });

/** Payroll with more verbs on the ledger's line: a folder with verbs and no thing.ts adds operations to another feature's thing. */
const onLine = (verbs: Readonly<Record<string, unknown>>): NonNullable<AppSpec["plant"]> =>
  ({ payroll: Object.entries(verbs).map(([verb, op]) => file(`things/gl-entry/verbs/${verb}.js`, { default: op })) });

const SUBMIT = "things/salary-slip/verbs/submit.js";
const ACCRUE = "things/gl-entry/verbs/accrue.js";

describe("#1134: the compiler refuses a feature writing another feature's thing", () => {
  it("refuses a database step that names another feature's thing (it changes it), wherever the step's operation is", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ submit: { post: Blueprint.step.database({ writes: [b.payroll.SalarySlip, b.ledger.GlEntry] }) } });
    await refusedWith(modelExit(b, { mounts: MOUNTED, verbs }), "payroll", SUBMIT, refusal(line(SUBMIT, "salary-slip.submit", ["step post"])));
  });

  it("refuses a verb a feature adds to another feature's thing that creates it, by the owner's creating move", async () => {
    const b = books();
    const plant = onLine({ accrue: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post }) });
    await refusedWith(modelExit(b, { mounts: MOUNTED, plant }), "payroll", ACCRUE, refusal(line(ACCRUE, "gl-entry.accrue", ["move post"])));
  });

  it("refuses a verb a feature adds to another feature's thing that moves it", async () => {
    const b = books();
    const plant = onLine({ undo: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.reverse }) });
    const path = "things/gl-entry/verbs/undo.js";
    await refusedWith(modelExit(b, { mounts: MOUNTED, plant }), "payroll", path, refusal(line(path, "gl-entry.undo", ["move reverse"])));
  });

  it("refuses a verb a feature adds to another feature's thing that changes it, by a step naming nothing and by a step naming its subject", async () => {
    const b = books();
    const plant = onLine({
      annotate: operation(b.ledger.GlEntry, { steps: { note: Blueprint.step.database() } }),
      stamp: operation(b.ledger.GlEntry, { steps: { note: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } }),
    });
    const exit = modelExit(b, { mounts: MOUNTED, plant });
    await refusedWith(exit, "payroll", "things/gl-entry/verbs/annotate.js", refusal(line("things/gl-entry/verbs/annotate.js", "gl-entry.annotate", ["step note"])));
    await refusedWith(exit, "payroll", "things/gl-entry/verbs/stamp.js", refusal(line("things/gl-entry/verbs/stamp.js", "gl-entry.stamp", ["step note"])));
  });

  it("refuses the keeper's move when its operation writes another feature's thing", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ lapse: { unwind: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } });
    const path = "things/salary-slip/verbs/lapse.js";
    await refusedWith(modelExit(b, { mounts: MOUNTED, verbs }), "payroll", path, refusal(line(path, "salary-slip.lapse", ["step unwind"])));
  });

  it("refuses a reaction to another feature's event that writes that feature's thing, offering only the operations that write that thing", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ settle: { mark: Blueprint.step.database({ writes: [b.ledger.JournalEntry] }) } });
    const path = "things/salary-slip/verbs/settle.js";
    await refusedWith(modelExit(b, { mounts: MOUNTED, verbs }), "payroll", path,
      refusal({ ...line(path, "salary-slip.settle", ["step mark"]), thing: "journal-entry", offers: ENTRY_WRITERS }));
  });

  it("refuses the first feature mounted writing a later one's thing: every mount is judged against every other, writer and owner each named in their place", async () => {
    const b = books();
    const path = "things/salary-slip/verbs/scribble.js";
    const plant = { ledger: [file(path, { default: operation(b.payroll.SalarySlip, { move: b.payroll.slipMachine.moves.submit }) })] };
    await refusedWith(modelExit(b, { mounts: MOUNTED, plant }), "ledger", path,
      refusal({ mount: "ledger", pkg: "ledger", path, feature: "ledger", operation: "salary-slip.scribble", how: ["move submit"], thing: "salary-slip", owner: "payroll", offers: SLIP_WRITERS }));
  });

  it("refuses a feature's own operation run inside another's commit when it writes another feature's thing, once, where the write is", async () => {
    const b = books();
    const accrue = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post });
    const verbs = b.payrollVerbs({ submit: { accrue: innerStep(accrue) } });
    const exit = modelExit(b, { mounts: MOUNTED, verbs, plant: onLine({ accrue }) });
    await refusedWith(exit, "payroll", ACCRUE, refusal(line(ACCRUE, "gl-entry.accrue", ["move post"])));
    // Running it is no second write: the outer is refused nothing of its own.
    expect((await namedAt(exit, at("payroll", SUBMIT))).named).toEqual([]);
  });

  it("refuses every write of one operation: one problem per thing, each naming every way, its move first and then its steps in order", async () => {
    const b = books();
    const steps: Readonly<Record<string, Step>> = {
      second: Blueprint.step.database({ writes: [b.ledger.GlEntry] }),
      first: Blueprint.step.database({ writes: [b.ledger.JournalEntry, b.ledger.GlEntry] }),
    };
    await refusedWith(modelExit(b, { mounts: MOUNTED, verbs: b.payrollVerbs({ submit: steps }) }), "payroll", SUBMIT,
      refusal(line(SUBMIT, "salary-slip.submit", ["step second", "step first"])),
      refusal({ ...line(SUBMIT, "salary-slip.submit", ["step first"]), thing: "journal-entry", offers: ENTRY_WRITERS }));
    // A move and a step on one thing: one problem naming both.
    const c = books();
    const plant = onLine({ accrue: operation(c.ledger.GlEntry, { move: c.ledger.glMachine.moves.post, steps: { note: Blueprint.step.database() } }) });
    await refusedWith(modelExit(c, { mounts: MOUNTED, plant }), "payroll", ACCRUE, refusal(line(ACCRUE, "gl-entry.accrue", ["move post", "step note"])));
  });

  it("refuses two operations of one feature writing one thing, each on its own, never offering the writer's own operations", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ submit: { a: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) }, settle: { b: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } });
    const exit = modelExit(b, { mounts: MOUNTED, verbs });
    await refusedWith(exit, "payroll", SUBMIT, refusal(line(SUBMIT, "salary-slip.submit", ["step a"])));
    const settle = "things/salary-slip/verbs/settle.js";
    await refusedWith(exit, "payroll", settle, refusal(line(settle, "salary-slip.settle", ["step b"])));
  });

  it("refuses a write to a thing whose owner offers no operation that writes it, saying so; the pay run's own two things are not named", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ start: { chart: Blueprint.step.database({ writes: [b.ledger.Account] }) } });
    const path = "things/payroll-entry/verbs/start.js";
    await refusedWith(modelExit(b, { mounts: MOUNTED, verbs }), "payroll", path,
      refusal({ ...line(path, "payroll-entry.start", ["step chart"]), thing: "account", offers: [] }));
  });

  it("refuses a feature that doesn't need the owner just the same, and never reads one that is installed but not mounted", async () => {
    const path = "things/gl-entry/verbs/scribble.js";
    const plant = (b: Books) => ({ rogue: [file(path, { default: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post }) })] });
    const b = books();
    await refusedWith(modelExit(b, { mounts: { ...MOUNTED, rogue: "rogue" }, plant: plant(b) }), "rogue", path,
      refusal({ ...line(path, "gl-entry.scribble", ["move post"]), mount: "rogue", pkg: "rogue", feature: "rogue" }));
    const quiet = books();
    expect(problemsOf(await modelExit(quiet, { mounts: MOUNTED, plant: plant(quiet) }))).toEqual([]);
  });

  it("names the features, the things and the operations by their mounts: features mounted under other names", async () => {
    const b = books();
    const plant = onLine({ accrue: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post }) });
    await refusedWith(modelExit(b, { mounts: { books: "ledger", wages: "payroll" }, plant }), "payroll", ACCRUE, refusal({
      mount: "wages", pkg: "payroll", path: ACCRUE, feature: "wages", operation: "books-gl-entry.accrue", how: ["move post"], thing: "books-gl-entry", owner: "books",
      offers: LINE_WRITERS.map((o) => `books-${o}`),
    }));
  });

  it("offers only the owner's operations the app keeps: one its mount omits isn't named, and one left is offered alone", async () => {
    const b = books();
    const plant = onLine({ accrue: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post }) });
    const some: AppSpec = { mounts: MOUNTED, edits: { ledger: (p) => [p.omit(b.ledger.reverse)] }, plant };
    await refusedWith(modelExit(b, some), "payroll", ACCRUE, refusal({ ...line(ACCRUE, "gl-entry.accrue", ["move post"]), offers: LINE_WRITERS.filter((o) => o !== "gl-entry.reverse") }));
    const c = books();
    const l = c.ledger;
    const one: AppSpec = { mounts: MOUNTED, edits: { ledger: (p) => [l.reverse, l.archive, l.touch, l.sweep, l.submit].map((o) => p.omit(o)) }, plant: onLine({ accrue: operation(l.GlEntry, { move: l.glMachine.moves.post }) }) };
    await refusedWith(modelExit(c, one), "payroll", ACCRUE, refusal({ ...line(ACCRUE, "gl-entry.accrue", ["move post"]), offers: ["gl-entry.post"] }));
  });

  it("refuses a write wherever the writing operation runs: on the caller's device, and on a chain, each pointed to the owner's operation on its own", async () => {
    const b = books();
    const local = "things/gl-entry/verbs/local.js";
    const seize = "things/vault/verbs/seize.js";
    const plant = {
      payroll: [
        // On the device: allowed to anyone, as a client operation must be, its step naming the line.
        file(local, { default: operation(b.ledger.GlEntry, { runs: "client", allowed: [Blueprint.anyone], steps: { save: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } }) }),
        // On a chain: a verb payroll adds to the ledger's vault, opening one by the vault's own move.
        file(seize, { default: b.ledger.onVault(b.ledger.vaultMachine.moves.open) }),
      ],
    };
    const exit = modelExit(b, { mounts: MOUNTED, plant });
    await refusedWith(exit, "payroll", local, refusal({ ...line(local, "gl-entry.local", ["step save"]), runs: "client" }));
    await refusedWith(exit, "payroll", seize, refusal({ ...line(seize, "vault.seize", ["move open"]), thing: "vault", offers: ["vault.open"], runs: "chain" }));
  });
});
