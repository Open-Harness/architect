// #1079 (CX-inner-operations): an operation runs another operation of the same app through a step that declares it,
// `Blueprint.step.operation(entryDraft)`. The model records the step, and every refusal of the inner operation is the outer's too: in its `errors`
// when the inner declared it, in its `refusals` always, and its rules in `invariants`, through any depth, so the SDK, the docs and the wire list them.
// What the compiler refuses is inner-operations-refused.test.ts; the scratch ledger is ./testing.ts. Written by the checks author for Goal 16; the
// builder never edits this file and only removes lines from `expected-failing/inner-operations.txt`.
import { Exit } from "effect";
import { describe, expect, it } from "vitest";
import { LEDGER, modelOf, problemsOf } from "./testing.ts";

describe("#1079: an operation's step runs another operation of the app", () => {
  it("records the step as an operation step naming the inner operation, beside the outer's own steps", async () => {
    const exit = await modelOf(LEDGER);
    expect(problemsOf(exit)).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    expect(exit.value.operations["run.pay"]?.steps).toEqual({
      load: { name: "run.pay.load", type: "database" },
      draft: { name: "run.pay.draft", type: "operation", operation: "entry.draft" },
      submit: { name: "run.pay.submit", type: "operation", operation: "entry.submit" },
    });
    // The inner operations are themselves, unchanged: running one inside another adds nothing to it.
    expect(exit.value.operations["entry.draft"]?.errors).toEqual(["BookClosed"]);
    expect(exit.value.operations["entry.submit"]?.errors).toEqual(["EntryHasNoLines"]);
  });

  it("every refusal of an inner operation is the outer's: its declared errors in `errors`, all of them in `refusals`, its rules in `invariants`", async () => {
    const exit = await modelOf(LEDGER);
    expect(problemsOf(exit)).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    const pay = exit.value.operations["run.pay"]!;
    const draft = exit.value.operations["entry.draft"]!;
    const submit = exit.value.operations["entry.submit"]!;
    // What each inner operation refuses, from the inner operations' own models: what the outer must say it refuses too.
    expect(new Set(draft.refusals)).toEqual(new Set(["BookClosed", "EntryRefTaken", "NotAllowed"]));
    expect(new Set(submit.refusals)).toEqual(new Set(["EntryHasNoLines", "EntryNotDraft", "EntryRefTaken", "NotAllowed"]));
    expect(draft.invariants).toEqual({ EntryRefTaken: "entry.oneRefPerBook" });
    expect(submit.invariants).toEqual({ EntryRefTaken: "entry.oneRefPerBook" });
    expect([...pay.errors].sort()).toEqual(["BookClosed", "EntryHasNoLines", "RunTooLarge"]);
    // RunNotFound and RunNotOpen are pay's own; the rest come from inside.
    expect([...pay.refusals].sort()).toEqual(["BookClosed", "EntryHasNoLines", "EntryNotDraft", "EntryRefTaken", "NotAllowed", "RunNotFound", "RunNotOpen", "RunTooLarge"]);
    // Each once, whatever two inner operations share.
    expect(pay.refusals.length).toBe(new Set(pay.refusals).size);
    expect(pay.errors.length).toBe(new Set(pay.errors).size);
    expect(pay.invariants).toEqual({ EntryRefTaken: "entry.oneRefPerBook" });
    expect(pay.breaks).toEqual(expect.arrayContaining(["entry.oneRefPerBook"]));
  });

  it("an inner operation's refusals reach the outer through an inner operation of its own (A runs B, B runs C)", async () => {
    // `run.close` runs `run.pay`, which runs the entry's two: everything the entry refuses is close's too.
    const close = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import runPay from "./pay.ts";
export default Blueprint.operation(Run, {
  description: "Close a run by paying it.",
  payload: { run: Run.fields.id }, answer: { run: Run.fields.id }, allowed: [Blueprint.signedIn],
  steps: { pay: Blueprint.step.operation(runPay) },
});
`;
    const exit = await modelOf({ ...LEDGER, "things/run/verbs/close.ts": close });
    expect(problemsOf(exit)).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    const op = exit.value.operations["run.close"]!;
    expect(op.steps["pay"]).toEqual({ name: "run.close.pay", type: "operation", operation: "run.pay" });
    expect([...op.errors].sort()).toEqual(["BookClosed", "EntryHasNoLines", "RunTooLarge"]);
    // RunNotFound is close's own: no role check reads its run.
    expect([...op.refusals].sort()).toEqual(["BookClosed", "EntryHasNoLines", "EntryNotDraft", "EntryRefTaken", "NotAllowed", "RunNotFound", "RunNotOpen", "RunTooLarge"]);
    expect(op.invariants).toEqual({ EntryRefTaken: "entry.oneRefPerBook" });
  });

  it("an outer open to anyone gets the inner's NotAllowed and <Thing>NotFound, which it has none of its own", async () => {
    // `book.check` names a book no role reads (BookNotFound) and needs a caller signed in (NotAllowed); `run.peek` is open to anyone.
    const check = `import { Blueprint } from "orthograph";
import { Book } from "../thing.ts";
export default Blueprint.operation(Book, {
  description: "Check a book.", payload: { book: Book.fields.id }, answer: {}, allowed: [Blueprint.signedIn],
});
`;
    const peek = `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import bookCheck from "../../book/verbs/check.ts";
export default Blueprint.operation(Run, {
  description: "Peek at a book.", payload: {}, answer: {}, allowed: [Blueprint.anyone],
  steps: { check: Blueprint.step.operation(bookCheck) },
});
`;
    const exit = await modelOf({ ...LEDGER, "things/book/verbs/check.ts": check, "things/run/verbs/peek.ts": peek });
    expect(problemsOf(exit)).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    expect([...exit.value.operations["book.check"]!.refusals].sort()).toEqual(["BookNotFound", "NotAllowed"]);
    expect([...exit.value.operations["run.peek"]!.refusals].sort()).toEqual(["BookNotFound", "NotAllowed"]);
  });

  it("the outer's hash moves when only its inner operation changes", async () => {
    // pay.ts is the same file both times; only entry.draft declares another error.
    const before = await modelOf(LEDGER);
    const after = await modelOf({
      ...LEDGER,
      "things/entry/verbs/draft.ts": LEDGER["things/entry/verbs/draft.ts"].replace("errors: [BookClosed]", "errors: [BookClosed, EntryHasNoLines]").replace("import { BookClosed }", "import { BookClosed, EntryHasNoLines }"),
    });
    expect(problemsOf(before)).toEqual([]);
    expect(problemsOf(after)).toEqual([]);
    if (!Exit.isSuccess(before) || !Exit.isSuccess(after)) return;
    expect(after.value.operations["entry.draft"]?.hash).not.toBe(before.value.operations["entry.draft"]?.hash);
    expect(after.value.operations["run.pay"]?.hash, "run.pay's refusals changed with its inner's").not.toBe(before.value.operations["run.pay"]?.hash);
    // Its own file and its inner's unchanged: the hash is the same, run to run.
    const again = await modelOf(LEDGER);
    expect(Exit.isSuccess(again) && again.value.operations["run.pay"]?.hash).toBe(before.value.operations["run.pay"]?.hash);
  });
});
