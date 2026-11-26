// #1134 (CX-feature-ownership): the compiler refuses a feature writing a thing another feature owns, by every way a feature writes: a database
// step that names it, a verb the feature adds to the other's thing that creates, moves or changes it, the keeper's move, a reaction to an event,
// and an operation run inside another's commit. Each refusal names the file, the writing feature, the operation, how it writes, the thing, the
// feature that owns it, and the owner's operations that write it, to run inside the commit instead (gap 1, `Blueprint.step.operation`). What
// passes is ownership.test.ts; the scratch books are ./ownership-testing.ts. Written by the checks author for Goal 16; the builder never edits
// this file and only removes lines from `expected-failing/ownership-refused.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint, type Step } from "orthograph";
import { LINE_WRITERS, MOUNTED, NOT_LINE_WRITERS, at, books, file, innerStep, modelExit, operation, problemsOf, type AppSpec, type Books } from "./ownership-testing.ts";

/** Every problem naming `where`: a refusal names the file that declared the write. */
const namedAt = async (exit: ReturnType<typeof modelExit>, where: string) => {
  const problems = problemsOf(await exit);
  expect(problems.length, "the blueprint is refused").toBeGreaterThan(0);
  return { problems, named: problems.filter((p) => p.includes(where)) };
};

/** The one problem naming `where`. */
const refusedAt = async (exit: ReturnType<typeof modelExit>, where: string) => {
  const { problems, named } = await namedAt(exit, where);
  expect(named, `one problem names ${where}; the problems were:\n${problems.join("\n")}`).toHaveLength(1);
  return named[0]!;
};

interface Said {
  readonly feature: string;
  readonly operation: string;
  /** How it writes: `step <key>` or `move <key>`. */
  readonly how: ReadonlyArray<string>;
  readonly thing: string;
  readonly owner: string;
  /** The owner's operations that write the thing, every one; and ones that don't, none of which may be named. */
  readonly offers: ReadonlyArray<string>;
  readonly notOffered: ReadonlyArray<string>;
}

/** The refusal says who writes what, how, whose it is, and what to run instead. */
const says = (said: string, s: Said) => {
  expect(said).toContain(`feature ${s.feature}`);
  expect(said).toContain(s.operation);
  for (const how of s.how) expect(said).toContain(how);
  expect(said).toContain(s.thing);
  expect(said).toContain(`feature ${s.owner}`);
  expect(said).toContain("Blueprint.step.operation");
  for (const op of s.offers) expect(said, `names ${op}, an operation of ${s.owner} that writes ${s.thing}`).toContain(op);
  for (const op of s.notOffered) expect(said, `doesn't name ${op}, which doesn't write ${s.thing}`).not.toContain(op);
};

const LINE = { feature: "payroll", thing: "gl-entry", owner: "ledger", offers: LINE_WRITERS, notOffered: NOT_LINE_WRITERS } as const;

/** Payroll with one more verb on the ledger's line: a folder with verbs and no thing.ts adds operations to another feature's thing. */
const onLine = (verb: string, op: unknown): NonNullable<AppSpec["plant"]> => ({ payroll: [file(`things/gl-entry/verbs/${verb}.js`, { default: op })] });

describe("#1134: the compiler refuses a feature writing another feature's thing", () => {
  it("refuses a database step that names another feature's thing (it changes it), wherever the step's operation is", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ submit: { post: Blueprint.step.database({ writes: [b.payroll.SalarySlip, b.ledger.GlEntry] }) } });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, verbs }), at("payroll", "things/salary-slip/verbs/submit.js"));
    says(said, { ...LINE, operation: "salary-slip.submit", how: ["step post"] });
  });

  it("refuses a verb a feature adds to another feature's thing that creates it, by the owner's creating move", async () => {
    const b = books();
    const accrue = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, plant: onLine("accrue", accrue) }), at("payroll", "things/gl-entry/verbs/accrue.js"));
    says(said, { ...LINE, operation: "gl-entry.accrue", how: ["move post"] });
  });

  it("refuses a verb a feature adds to another feature's thing that moves it", async () => {
    const b = books();
    const undo = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.reverse });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, plant: onLine("undo", undo) }), at("payroll", "things/gl-entry/verbs/undo.js"));
    says(said, { ...LINE, operation: "gl-entry.undo", how: ["move reverse"] });
  });

  it("refuses a verb a feature adds to another feature's thing that changes it, by a database step naming nothing (its own subject)", async () => {
    const b = books();
    const annotate = operation(b.ledger.GlEntry, { steps: { note: Blueprint.step.database() } });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, plant: onLine("annotate", annotate) }), at("payroll", "things/gl-entry/verbs/annotate.js"));
    says(said, { ...LINE, operation: "gl-entry.annotate", how: ["step note"] });
  });

  it("refuses the keeper's move when its operation writes another feature's thing", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ lapse: { unwind: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, verbs }), at("payroll", "things/salary-slip/verbs/lapse.js"));
    says(said, { ...LINE, operation: "salary-slip.lapse", how: ["step unwind"] });
  });

  it("refuses a reaction to another feature's event that writes that feature's thing, naming only the operations that write that thing", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ settle: { mark: Blueprint.step.database({ writes: [b.ledger.JournalEntry] }) } });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, verbs }), at("payroll", "things/salary-slip/verbs/settle.js"));
    // A journal entry is written by its draft and its submit; the line's own operations don't write it.
    says(said, { feature: "payroll", operation: "salary-slip.settle", how: ["step mark"], thing: "journal-entry", owner: "ledger", offers: ["journal-entry.draft", "journal-entry.submit"], notOffered: ["gl-entry.post", "gl-entry.reverse", "gl-entry.preview", "gl-entry.get"] });
  });

  it("refuses a feature's own operation run inside another's commit when it writes another feature's thing, once, where the write is", async () => {
    const b = books();
    const accrue = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post });
    const verbs = b.payrollVerbs({ submit: { accrue: innerStep(accrue) } });
    const exit = modelExit(b, { mounts: MOUNTED, verbs, plant: onLine("accrue", accrue) });
    const said = await refusedAt(exit, at("payroll", "things/gl-entry/verbs/accrue.js"));
    says(said, { ...LINE, operation: "gl-entry.accrue", how: ["move post"] });
    // Running it is no second write: the outer is refused nothing of its own.
    const { named } = await namedAt(exit, at("payroll", "things/salary-slip/verbs/submit.js"));
    expect(named).toEqual([]);
  });

  it("refuses every write of one operation: one problem per thing, each naming every way it writes that thing", async () => {
    const b = books();
    const steps: Readonly<Record<string, Step>> = {
      first: Blueprint.step.database({ writes: [b.ledger.GlEntry] }),
      second: Blueprint.step.database({ writes: [b.ledger.JournalEntry, b.ledger.GlEntry] }),
    };
    const { problems, named } = await namedAt(modelExit(b, { mounts: MOUNTED, verbs: b.payrollVerbs({ submit: steps }) }), at("payroll", "things/salary-slip/verbs/submit.js"));
    expect(named, problems.join("\n")).toHaveLength(2);
    const lines = named.filter((p) => !p.includes("journal-entry.draft"));
    expect(lines, problems.join("\n")).toHaveLength(1);
    says(lines[0]!, { ...LINE, operation: "salary-slip.submit", how: ["step first", "step second"] });
    const entries = named.filter((p) => p.includes("journal-entry.draft"));
    expect(entries, problems.join("\n")).toHaveLength(1);
    says(entries[0]!, { feature: "payroll", operation: "salary-slip.submit", how: ["step second"], thing: "journal-entry", owner: "ledger", offers: ["journal-entry.draft", "journal-entry.submit"], notOffered: ["gl-entry.post"] });
  });

  it("refuses a write to a thing whose owner offers no operation that writes it, saying so; a pay run's own two things are not named", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ start: { chart: Blueprint.step.database({ writes: [b.ledger.Account] }) } });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, verbs }), at("payroll", "things/payroll-entry/verbs/start.js"));
    expect(said).toContain("feature payroll");
    expect(said).toContain("payroll-entry.start");
    expect(said).toContain("step chart");
    expect(said).toContain("account");
    expect(said).toContain("feature ledger");
    expect(said).toContain("no operation that writes it");
    expect(said).not.toContain("step slips");
  });

  it("refuses a feature that doesn't need the owner just the same, and never reads one that is installed but not mounted", async () => {
    const plant = (b: Books) => ({ rogue: [file("things/gl-entry/verbs/scribble.js", { default: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post }) })] });
    const b = books();
    const said = await refusedAt(modelExit(b, { mounts: { ...MOUNTED, rogue: "rogue" }, plant: plant(b) }), at("rogue", "things/gl-entry/verbs/scribble.js"));
    says(said, { ...LINE, feature: "rogue", operation: "gl-entry.scribble", how: ["move post"] });
    const quiet = books();
    expect(problemsOf(await modelExit(quiet, { mounts: MOUNTED, plant: plant(quiet) }))).toEqual([]);
  });

  it("names the features, the things and the operations by their mounts: a feature mounted under another name", async () => {
    const b = books();
    const accrue = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post });
    const said = await refusedAt(modelExit(b, { mounts: { books: "ledger", wages: "payroll" }, plant: onLine("accrue", accrue) }), at("payroll", "things/gl-entry/verbs/accrue.js"));
    says(said, {
      feature: "wages", operation: "books-gl-entry.accrue", how: ["move post"], thing: "books-gl-entry", owner: "books",
      offers: LINE_WRITERS.map((o) => `books-${o}`), notOffered: NOT_LINE_WRITERS.map((o) => `books-${o}`),
    });
    expect(said).not.toContain("feature ledger");
    expect(said).not.toContain("feature payroll");
  });

  it("offers only the owner's operations the app keeps: one its mount omits isn't named", async () => {
    const b = books();
    const accrue = operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.post });
    const spec: AppSpec = { mounts: MOUNTED, edits: { ledger: (p) => [p.omit(b.ledger.reverse)] }, plant: onLine("accrue", accrue) };
    const said = await refusedAt(modelExit(b, spec), at("payroll", "things/gl-entry/verbs/accrue.js"));
    says(said, { ...LINE, operation: "gl-entry.accrue", how: ["move post"], offers: ["gl-entry.post", "journal-entry.submit"], notOffered: [...NOT_LINE_WRITERS, "gl-entry.reverse"] });
  });
});
