// #1134 (CX-feature-ownership): what a feature may do with things, and still compile. A feature writes its own things by every way it has; it
// reads, links to and reacts to another feature's; it writes another feature's thing only by running the owner's operation inside its commit
// (gap 1, #1079); and the app, which is no feature, writes any thing. Each check also plants the one wrong write beside the right ones and
// shows it refused, so a compiler that refuses nothing, or everything, fails it. What is refused, and how it is said, is ownership-refused.test.ts;
// the scratch books are ./ownership-testing.ts. Written by the checks author for Goal 16; the builder never edits this file and only removes
// lines from `expected-failing/ownership.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint, Via } from "orthograph";
import { MOUNTED, at, books, file, innerStep, modelExit, modelOf, operation, problemsOf, type AppSpec } from "./ownership-testing.ts";

/** The problems naming `where`, of a blueprint that must be refused. */
const refusedAt = async (spec: Parameters<typeof modelExit>, where: string) => {
  const problems = problemsOf(await modelExit(...spec));
  expect(problems.filter((p) => p.includes(where)), `the plant is refused, naming ${where}; the problems were:\n${problems.join("\n")}`).toHaveLength(1);
};

describe("#1134: a feature writes its own things, reads anyone's, and writes another's only through the owner's operation", () => {
  it("compiles a feature writing its own things by every way: a creating move, a move, a step, the keeper, a reaction, two of its things in one step", async () => {
    const b = books();
    const m = await modelOf(b, { mounts: MOUNTED });
    for (const op of ["salary-slip.draft", "salary-slip.submit", "salary-slip.lapse", "salary-slip.settle", "payroll-entry.start", "journal-entry.submit", "gl-entry.post", "gl-entry.archive", "gl-entry.touch", "gl-entry.sweep"]) {
      expect(m.operations[op], `${op} is in the model`).toBeDefined();
    }
    expect(m.operations["payroll-entry.start"]?.steps["slips"]?.writes).toEqual(["payroll-entry", "salary-slip"]);
    // The owner writing its own line from another of its things compiles too: journal-entry.submit writes gl-entry.
    expect(m.operations["journal-entry.submit"]?.steps["lines"]?.writes).toEqual(["journal-entry", "gl-entry"]);
    // The control: the same books, one step of the same pay run writing the ledger's line.
    const wrong = books();
    await refusedAt([wrong, { mounts: MOUNTED, verbs: wrong.payrollVerbs({ start: { post: Blueprint.step.database({ writes: [wrong.ledger.GlEntry] }) } }) }], at("payroll", "things/payroll-entry/verbs/start.js"));
  });

  it("compiles a feature reading, linking to and adding no-write verbs to another feature's thing; the same verb with a write is refused", async () => {
    const b = books();
    const SlipLine = Blueprint.thing({ description: "A slip's line, linked to the ledger line it posted.", fields: { id: Blueprint.id("spl"), entry: b.ledger.GlEntry.fields.id }, code: "SL" });
    const plant: AppSpec["plant"] = {
      payroll: [
        file("things/slip-line/thing.js", { SlipLine }),
        // A read of the line, by id.
        file("things/gl-entry/verbs/look.js", { default: Blueprint.read(b.ledger.GlEntry, { by: "id", fields: ["id", "memo", "state"], allowed: [Blueprint.signedIn] }) }),
        // An operation on the line that reads only (`writes: []`), and one with no step at all: neither writes it.
        file("things/gl-entry/verbs/check.js", { default: operation(b.ledger.GlEntry, { steps: { look: Blueprint.step.database({ writes: [] }) } }) }),
        file("things/gl-entry/verbs/flag.js", { default: operation(b.ledger.GlEntry, {}) }),
        // An operation on the line that writes only payroll's own slip: the line is its subject, never written.
        file("things/gl-entry/verbs/attach.js", { default: operation(b.ledger.GlEntry, { steps: { slip: Blueprint.step.database({ writes: [b.payroll.SalarySlip] }) } }) }),
      ],
    };
    const m = await modelOf(b, { mounts: MOUNTED, plant });
    for (const op of ["gl-entry.look", "gl-entry.check", "gl-entry.flag", "gl-entry.attach"]) expect(m.operations[op], `${op} is in the model`).toBeDefined();
    expect(m.things["slip-line"]).toBeDefined();
    // The control: the same verb, its step naming nothing, writes its subject, the line.
    const wrong = books();
    const writes = { payroll: [file("things/gl-entry/verbs/attach.js", { default: operation(wrong.ledger.GlEntry, { steps: { slip: Blueprint.step.database() } }) })] };
    await refusedAt([wrong, { mounts: MOUNTED, plant: writes }], at("payroll", "things/gl-entry/verbs/attach.js"));
  });

  it("compiles the app writing any feature's thing, by its own step and by a verb it adds to the feature's thing; the same from payroll is refused", async () => {
    const b = books();
    const Note = Blueprint.thing({ description: "The app's own note.", fields: { id: Blueprint.id("nte"), memo: Blueprint.text({ max: 100 }) }, code: "NT" });
    const files = [
      file("things/note/thing.ts", { Note }),
      file("things/note/verbs/post.ts", { default: operation(Note, { steps: { books: Blueprint.step.database({ writes: [Note, b.ledger.GlEntry, b.payroll.SalarySlip] }) } }) }),
      file("things/gl-entry/verbs/correct.ts", { default: operation(b.ledger.GlEntry, { move: b.ledger.glMachine.moves.reverse }) }),
    ];
    const m = await modelOf(b, { mounts: MOUNTED, files });
    expect(m.operations["note.post"]?.steps["books"]?.writes).toEqual(["note", "gl-entry", "salary-slip"]);
    expect(m.operations["gl-entry.correct"]?.from).toEqual({ kind: "app" });
    const wrong = books();
    const plant = { payroll: [file("things/gl-entry/verbs/correct.js", { default: operation(wrong.ledger.GlEntry, { move: wrong.ledger.glMachine.moves.reverse }) })] };
    await refusedAt([wrong, { mounts: MOUNTED, plant }], at("payroll", "things/gl-entry/verbs/correct.js"));
  });

  it("compiles a feature writing another's thing the allowed way, running the owner's operations inside its commit; writing it directly is refused", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ submit: { post: innerStep(b.ledger.post), entry: innerStep(b.ledger.submit) } });
    const m = await modelOf(b, { mounts: MOUNTED, verbs });
    expect(m.operations["salary-slip.submit"]?.steps["post"]?.type).toBe("operation");
    expect(m.operations["salary-slip.submit"]?.steps["entry"]?.type).toBe("operation");
    const wrong = books();
    const direct = wrong.payrollVerbs({ submit: { post: innerStep(wrong.ledger.post), lines: Blueprint.step.database({ writes: [wrong.ledger.GlEntry] }) } });
    await refusedAt([wrong, { mounts: MOUNTED, verbs: direct }], at("payroll", "things/salary-slip/verbs/submit.js"));
  });

  it("compiles every way under other mount names, where a thing is known by its mount; the wrong write is refused there too", async () => {
    const b = books();
    const mounts = { books: "ledger", wages: "payroll" } as const;
    const m = await modelOf(b, { mounts });
    expect(Object.keys(m.things).filter((t) => t.startsWith("books-") || t.startsWith("wages-")).sort()).toEqual(["books-account", "books-gl-entry", "books-journal-entry", "books-vault", "wages-payroll-entry", "wages-salary-slip"]);
    const wrong = books();
    await refusedAt([wrong, { mounts, verbs: wrong.payrollVerbs({ settle: { post: Blueprint.step.database({ writes: [wrong.ledger.GlEntry] }) } }) }], at("payroll", "things/salary-slip/verbs/settle.js"));
  });

  it("never judges an operation the app's mount omits: it isn't in the app; kept, or only narrowed, the same operation is refused", async () => {
    const b = books();
    const verbs = b.payrollVerbs({ submit: { post: Blueprint.step.database({ writes: [b.ledger.GlEntry] }) } });
    const m = await modelOf(b, { mounts: MOUNTED, verbs, edits: { payroll: (p) => [p.omit(verbs.submit)] } });
    expect(m.operations["salary-slip.submit"]).toBeUndefined();
    const wrong = books();
    await refusedAt([wrong, { mounts: MOUNTED, verbs: wrong.payrollVerbs({ submit: { post: Blueprint.step.database({ writes: [wrong.ledger.GlEntry] }) } }) }], at("payroll", "things/salary-slip/verbs/submit.js"));
    // Narrowed to fewer ways in, it is still in the app, and still refused.
    const narrowed = books();
    const nv = narrowed.payrollVerbs({ submit: { post: Blueprint.step.database({ writes: [narrowed.ledger.GlEntry] }) } });
    await refusedAt([narrowed, { mounts: MOUNTED, verbs: nv, edits: { payroll: (p) => [p.narrow(nv.submit, { via: [Via.session] })] } }], at("payroll", "things/salary-slip/verbs/submit.js"));
  });
});
