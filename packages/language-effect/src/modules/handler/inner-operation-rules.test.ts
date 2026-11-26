// #1079 (CX-inner-operations): an inner operation is judged by its own rules for the same caller: its access rule (never widened by an outer the
// caller may run), its machine's from-check (#972: the other thing's own NotFrom), its G5 rules with its own refusal, and its answer's declaration;
// a step it didn't declare is no runner; and it runs in its own span inside the outer's step. The scratch ledger is ./testing.ts; the commit itself is
// inner-operation.test.ts. Written by the checks author for Goal 16; the builder never edits this file and only removes lines from
// `expected-failing/inner-operation-rules.txt`.
import { Cause, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { NotAllowed } from "#modules/access/types.js";
import { EntryRefTaken, ada, bob, call, deathOf, hooks, refusalOf, serve, untouched, world, type World } from "./testing.ts";

describe("#1079: an inner operation is judged by its own rules, for the caller", () => {
  it("the other thing's own machine refuses a move it can't make from its state, with that thing's NotFrom (#972)", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).repost, { run: "run_1", entry: "ent_done" });
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toMatchObject({ _tag: "EntryNotDraft", state: "submitted" });
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    // Refused by the from-check, before the inner handler ran.
    expect(h.ran).toEqual(["run.repost"]);
    // An operation it didn't declare as a step is not handed to it, whatever the server wired.
    expect(h.undeclared, "steps.draft on run.repost, which declares only submit").toBeUndefined();
  });

  it("the inner operation's access rule is judged for the caller: the outer admits bob, the entry's keeper rule doesn't, so NotAllowed and nothing is written", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_1" }, bob);
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toBeInstanceOf(NotAllowed);
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    // The inner handler never ran for a caller its rule refuses.
    expect(h.ran).toEqual(["run.pay"]);
    // The same for the submit alone: bob may call repost, and may not submit ada's entry.
    const again = await call(w, serve(h).repost, { run: "run_1", entry: "ent_done" }, bob);
    expect((refusalOf(again) as { _tag?: string } | undefined)?._tag).toBe("NotAllowed");
    expect(h.ran).toEqual(["run.pay", "run.repost"]);
  });

  it("what the inner operation's payload names is read in this call, and a missing one is refused with its <Thing>NotFound", async () => {
    const w = world();
    const found = await call(w, serve(hooks()).peek, { book: "bok_open" }, ada);
    expect(deathOf(found)).toBe("no defect");
    expect(Exit.isSuccess(found) ? found.value : refusalOf(found)).toEqual({ book: "bok_open" });
    const missing = await call(w, serve(hooks()).peek, { book: "bok_none" }, ada);
    expect(deathOf(missing)).toBe("no defect");
    expect(refusalOf(missing)).toMatchObject({ _tag: "BookNotFound", id: "bok_none" });
    // The outer is open to anyone, the inner isn't: an anonymous caller is NotAllowed by the inner.
    const anonymous = await call(w, serve(hooks()).peek, { book: "bok_open" }, { kind: "anonymous" });
    expect(refusalOf(anonymous)).toBeInstanceOf(NotAllowed);
    expect(w.memory.rows).toEqual(untouched());
  });

  it("the inner operation's G5 rule refuses with the inner operation's own refusal, filled from its row, and nothing is written", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_dup" });
    expect(deathOf(exit)).toBe("no defect");
    const refusal = refusalOf(exit);
    expect(refusal).toBeInstanceOf(EntryRefTaken);
    expect(refusal).toMatchObject({ _tag: "EntryRefTaken", ref: "R-9" });
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
  });

  it("an inner operation's answer outside its declaration is a defect that names it, and nothing is written", async () => {
    const w = world();
    const h = hooks();
    h.draftAnswer = { entry: 42 };
    const exit = await call(w, serve(h).pay, { run: "run_1" });
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    expect(deathOf(exit)).toContain("entry.draft answered outside its declaration");
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    expect(h.ran).toEqual(["run.pay", "entry.draft"]);
    // The inner operation's span ends as the defect's, naming it.
    const draftSpan = w.spans.find((s) => s.name === "entry.draft");
    expect(String(draftSpan?.attributes.get("defect"))).toContain("entry.draft answered outside its declaration");
  });

  it("each inner operation runs in its own span, named after it, inside the outer's step span, and its refusal is on it", async () => {
    const ok = world();
    await call(ok, serve(hooks()).pay, { run: "run_1" });
    const named = (w: World, name: string) => w.spans.filter((s) => s.name === name);
    for (const [step, inner] of [["run.pay.draft", "entry.draft"], ["run.pay.submit", "entry.submit"]] as const) {
      const stepSpan = named(ok, step);
      const innerSpan = named(ok, inner);
      expect(stepSpan, step).toHaveLength(1);
      expect(innerSpan, inner).toHaveLength(1);
      expect(innerSpan[0]!.parent._tag === "Some" ? innerSpan[0]!.parent.value.spanId : undefined, `${inner} is inside ${step}`).toBe(stepSpan[0]!.spanId);
      expect(stepSpan[0]!.attributes.get("step.kind")).toBe("operation");
      // Who called, as on the outer's span, and the move the inner made.
      expect(innerSpan[0]!.attributes.get("principal.kind"), inner).toBe("person");
    }
    expect(named(ok, "entry.submit")[0]?.attributes.get("move.from")).toBe("draft");
    expect(named(ok, "entry.submit")[0]?.attributes.get("move.name")).toBe("submit");
    const refused = world();
    await call(refused, serve(hooks()).pay, { run: "run_shut" });
    expect(named(refused, "entry.draft")[0]?.attributes.get("refusal")).toBe("BookClosed");
  });
});
