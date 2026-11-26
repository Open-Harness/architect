// #1079 (CX-inner-operations): a handler runs another operation of the same app inside its own commit, through a step that declares it
// (`Blueprint.step.operation(entryDraft)`), as `steps.draft(payload)`. The inner operation's writes and events join the outer's one commit, so both
// commit or neither does, and what it wrote is visible to the outer afterwards and to the next inner step. Its refusal reaches the caller as its
// declared error: a refusal, never a defect. A lost race runs the whole call again. The scratch ledger is ./testing.ts; the inner operations' own
// rules (access, machine, G5), the answer check and the spans are inner-operation-rules.test.ts; the D1 half is e2e/m2/13-inner-operations.test.ts.
// Written by the checks author for Goal 16; the builder never edits this file and only removes lines from `expected-failing/inner-operation.txt`.
import { Effect, Exit, Metric } from "effect";
import { describe, expect, it } from "vitest";
import { Store } from "#modules/records/types.js";
import { BookClosed, Entry, EntryHasNoLines, Line, Run, ada, call, deathOf, hooks, refusalOf, rowsOf, serve, untouched, world } from "./testing.ts";

describe("#1079: a handler runs another operation of the same app inside its own commit", () => {
  it("commits the run and both inner operations together: the run paid, the entry submitted with its line, and the three events in order, on the call's trace", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toBeUndefined();
    const answer = Exit.isSuccess(exit) ? (exit.value as { run: string; entry: string }) : { run: "", entry: "" };
    expect(answer.run).toBe("run_1");
    expect(answer.entry).toMatch(/^ent_[0-9a-z]+$/);
    const entry = answer.entry;
    // One new entry and one new line, as the inner operations made them; the run moved and names the entry.
    const entries = rowsOf(w, Entry).filter((r) => r.instance["id"] !== "ent_done");
    expect(entries.map((r) => r.instance)).toEqual([{ id: entry, book: "bok_open", amount: 500n, ref: "R-1", state: "submitted" }]);
    const lines = rowsOf(w, Line).filter((r) => r.instance["id"] !== "lin_done");
    expect(lines.map((r) => r.instance)).toEqual([{ id: `lin_${entry.slice(4)}`, entry, amount: 500n }]);
    expect(rowsOf(w, Run).find((r) => r.instance["id"] === "run_1")).toMatchObject({ instance: { posted: entry, state: "paid" }, version: 1 });
    // Every other row as it was.
    const others = w.memory.rows.filter((r) => !(r.thing === Run && r.instance["id"] === "run_1") && r.instance["id"] !== entry && r.instance["id"] !== `lin_${entry.slice(4)}`);
    expect(others).toEqual(untouched().filter((r) => !(r.thing === Run && r.instance["id"] === "run_1")));
    // Each operation's own event, journalled once, in the order the moves were made, each naming the operation that moved and on this call's trace.
    const trace = w.spans.find((s) => s.name === "run.pay")?.traceId;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);
    expect(w.memory.entries.map(({ trace: t, operation, move, subject, event, fields }) => ({ t, operation, move, subject, event, fields }))).toEqual([
      { t: trace, operation: "entry.draft", move: "draft", subject: entry, event: "EntryDrafted", fields: { entry, amount: "500" } },
      { t: trace, operation: "entry.submit", move: "submit", subject: entry, event: "EntrySubmitted", fields: { entry } },
      { t: trace, operation: "run.pay", move: "pay", subject: "run_1", event: "RunPaid", fields: { run: "run_1", entry } },
    ]);
    expect(h.ran).toEqual(["run.pay", "entry.draft", "run.pay after draft", "entry.submit"]);
  });

  it("the inner operations' writes are visible to the outer handler afterwards, and to the next inner step", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    const entry = Exit.isSuccess(exit) ? (exit.value as { entry: string }).entry : "ent_none";
    expect(h.seen).toEqual([{
      // After the draft: the entry as the draft left it (its fields and its state), and its line, found by a list.
      afterDraft: { id: entry, book: "bok_open", amount: 500n, ref: "R-1", state: "draft" },
      lines: [{ id: `lin_${entry.slice(4)}`, entry, amount: 500n }],
      // After the submit, whose from-check read the drafted entry and whose handler listed its line: submitted.
      afterSubmit: { id: entry, book: "bok_open", amount: 500n, ref: "R-1", state: "submitted" },
      // The inner answer as code has it: its amount a bigint, not the wire's text.
      answered: "bigint",
    }]);
    // The submit was handed the drafted entry as its subject: its prehandle read through this call's writes.
    expect(h.subjects).toEqual([{ id: entry, book: "bok_open", amount: 500n, ref: "R-1", state: "draft" }]);
  });

  it("an inner operation's refusal reaches the caller as that operation's declared error, counted as a refusal, and nothing is written", async () => {
    const w = world();
    const h = hooks();
    const registry = new Map();
    const exit = await Effect.runPromiseExit((serve(h).pay.call({ run: "run_shut" }, ada) as Effect.Effect<unknown, unknown, never>).pipe(
      Effect.provide(w.layer), Effect.provideService(Metric.MetricRegistry, registry)));
    expect(deathOf(exit)).toBe("no defect");
    const refusal = refusalOf(exit);
    expect(refusal).toBeInstanceOf(BookClosed);
    expect(refusal).toMatchObject({ _tag: "BookClosed", book: "bok_shut" });
    // The outer's span says the refusal by its tag, as prove reads it, and the call is counted refused, not a defect.
    expect(w.spans.find((s) => s.name === "run.pay")?.attributes.get("refusal")).toBe("BookClosed");
    const counted = await Effect.runPromise(Metric.snapshot.pipe(Effect.provideService(Metric.MetricRegistry, registry)));
    // One call, the outer's: an inner operation is part of it, never a call of its own.
    const calls = counted.flatMap((s) => (s.type === "Counter" && s.id === "ortho.calls" ? [{ ...s.attributes, count: Number(s.state.count) }] : []));
    expect(calls).toEqual([{ operation: "run.pay", "principal.kind": "person", outcome: "refused", refusal: "BookClosed", count: 1 }]);
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    // The outer handler went no further than the step that refused.
    expect(h.ran).toEqual(["run.pay", "entry.draft"]);
    // The inner operation's span says the refusal and the log that decided it.
    const draftSpan = w.spans.find((s) => s.name === "entry.draft");
    expect(draftSpan?.attributes.get("refusal")).toBe("BookClosed");
    expect(draftSpan?.attributes.get("refusal.log")).toBe("the book is closed");
  });

  it("an inner operation that runs inner operations of its own commits them all in one: three events in the order made", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).close, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    expect(Exit.isSuccess(exit) ? exit.value : refusalOf(exit)).toEqual({ run: "run_1" });
    const entry = String(rowsOf(w, Run).find((r) => r.instance["id"] === "run_1")?.instance["posted"]);
    expect(entry).toMatch(/^ent_[0-9a-z]+$/);
    expect(rowsOf(w, Entry).find((r) => r.instance["id"] === entry)?.instance["state"]).toBe("submitted");
    expect(w.memory.entries.map((e) => [e.operation, e.event, e.subject])).toEqual([
      ["entry.draft", "EntryDrafted", entry], ["entry.submit", "EntrySubmitted", entry], ["run.pay", "RunPaid", "run_1"],
    ]);
    const trace = w.spans.find((s) => s.name === "run.close")?.traceId;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set(w.memory.entries.map((e) => e.trace))).toEqual(new Set([trace]));
    expect(h.ran).toEqual(["run.close", "run.pay", "entry.draft", "run.pay after draft", "entry.submit"]);
  });

  it("an inner operation sees what the outer wrote before it: the outer closes the book, so the draft refuses, and nothing is written", async () => {
    const w = world();
    const h = hooks();
    h.closeFirst = true;
    const exit = await call(w, serve(h).pay, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toMatchObject({ _tag: "BookClosed", book: "bok_open" });
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
  });

  it("one step runs as often as the handler calls it, each run its own entry and event, all in one commit", async () => {
    const w = world();
    const exit = await call(w, serve(hooks()).split, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    expect(Exit.isSuccess(exit) ? exit.value : refusalOf(exit)).toEqual({ run: "run_1" });
    const made = rowsOf(w, Entry).filter((r) => r.instance["id"] !== "ent_done").map((r) => r.instance);
    expect(made.map((e) => [e["ref"], e["amount"], e["state"]])).toEqual([["R-1a", 250n, "draft"], ["R-1b", 250n, "draft"]]);
    expect(new Set(made.map((e) => e["id"])).size, "two entries, two ids").toBe(2);
    expect(w.memory.entries.map((e) => [e.operation, e.event, e.subject])).toEqual(made.map((e) => ["entry.draft", "EntryDrafted", e["id"]]));
  });

  it("a refusal from the second inner operation undoes what the first one wrote: no entry, no line, no event", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_zero" });
    expect(deathOf(exit)).toBe("no defect");
    const refusal = refusalOf(exit) as { _tag?: string; entry?: string } | undefined;
    expect(refusal).toBeInstanceOf(EntryHasNoLines);
    expect(refusal?.entry).toMatch(/^ent_[0-9a-z]+$/);
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    expect(h.ran).toEqual(["run.pay", "entry.draft", "run.pay after draft", "entry.submit"]);
  });

  it("the outer's own refusal after both inner operations ran writes neither", async () => {
    const w = world();
    const h = hooks();
    const exit = await call(w, serve(h).pay, { run: "run_big" });
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toMatchObject({ _tag: "RunTooLarge", run: "run_big" });
    expect(w.memory.rows).toEqual(untouched());
    expect(w.memory.entries).toEqual([]);
    expect(h.ran).toEqual(["run.pay", "entry.draft", "run.pay after draft", "entry.submit"]);
  });

  it("a lost race runs the outer and its inner operations again, and commits them once", async () => {
    const w = world();
    const h = hooks();
    // On the first attempt only, another call changes run_1 after both inner steps: the outer's update of it is now stale.
    h.between = (attempt) => attempt > 1 ? Effect.void : Effect.gen(function* () {
      const store = yield* Store;
      expect(yield* store.commit({ writes: [{ kind: "update", thing: Run, id: "run_1", version: 0, changes: { posted: "" }, state: undefined }], entries: [] })).toBe("committed");
    });
    const exit = await call(w, serve(h).pay, { run: "run_1" });
    expect(deathOf(exit)).toBe("no defect");
    expect(refusalOf(exit)).toBeUndefined();
    const entry = Exit.isSuccess(exit) ? (exit.value as { entry: string }).entry : "ent_none";
    expect(h.ran.filter((r) => r === "run.pay"), "two attempts").toHaveLength(2);
    expect(h.ran.filter((r) => r === "entry.draft"), "the inner ran in each").toHaveLength(2);
    // Only the second attempt's entry and line, and its three events.
    expect(rowsOf(w, Entry).map((r) => r.instance["id"]).sort()).toEqual(["ent_done", entry].sort());
    expect(rowsOf(w, Line).map((r) => r.instance["id"]).sort()).toEqual(["lin_done", `lin_${entry.slice(4)}`].sort());
    expect(w.memory.entries.map((e) => [e.event, e.subject])).toEqual([["EntryDrafted", entry], ["EntrySubmitted", entry], ["RunPaid", "run_1"]]);
    expect(rowsOf(w, Run).find((r) => r.instance["id"] === "run_1")).toMatchObject({ instance: { posted: entry, state: "paid" }, version: 2 });
  });
});
