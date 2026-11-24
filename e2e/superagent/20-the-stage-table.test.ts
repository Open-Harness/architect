// Check 20 (slice 6): the ticket stage table, row by row (the prototype's `003`, GOAL17-derived-reads' table, "first match wins").
// `stageOf` is pure (GOAL17-derived-reads, section 4), so every row, and every pair of rows that decides which wins, is a case.
// The read `ticket.stage` and `ticket.waiting` serve is `stageOf` over what the looks found; the served read's own rows wait on the
// harness (`README.md`, "Slice 6"), so this is where the table itself is judged.
//
// The cases' expected values come from the record's table, never from `stageOf`. CONTROLS: `reference` is that table written out
// again from the record, and it passes every case; each planted wrong table (two rows swapped, a row dropped, a wrong `why`, a
// wrong stage, a label that is the row below's) fails at least one, so a table that is right on some rows and wrong on one cannot
// pass. The row for a closing Assignment is GOAL17-stage-one's call 6: `working`, `none`, "Stopping", below a question and a ready report.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { superagent } from "./app.ts";

type Stage = "person" | "working" | "idle" | "ended";
type Why = "delivery" | "answer" | "review" | "blocked" | "failed" | "queued" | "none";
interface Row { readonly stage: Stage; readonly why: Why; readonly label: string }
interface Facts {
  readonly report: { readonly state: string; readonly seq: bigint } | undefined;
  readonly assignment: { readonly state: string } | undefined;
  readonly attention: object | undefined;
  readonly undelivered: object | undefined;
  readonly person: { readonly seq: bigint } | undefined;
}
type StageOf = (ticket: { readonly state: string }, f: Facts) => Row;

const none: Facts = { report: undefined, assignment: undefined, attention: undefined, undelivered: undefined, person: undefined };
const open = { state: "open" };
const running = { state: "running" };
const report = (state: string, seq = 5n) => ({ state, seq });

interface Case { readonly name: string; readonly ticket: { readonly state: string }; readonly facts: Facts; readonly want: { readonly stage: Stage | ReadonlyArray<Stage>; readonly why: Why | ReadonlyArray<Why>; readonly label: string | RegExp } }
const c = (name: string, ticket: { state: string }, facts: Partial<Facts>, stage: Case["want"]["stage"], why: Case["want"]["why"], label: string | RegExp): Case => ({ name, ticket, facts: { ...none, ...facts }, want: { stage, why, label } });
const among = <T>(want: T | ReadonlyArray<T>, got: T) => (Array.isArray(want) ? (want as ReadonlyArray<T>).includes(got) : want === got);

/** Every row of the table, then the pairs that decide which row wins. Labels are the record's words. */
const CASES: ReadonlyArray<Case> = [
  c("an ended ticket is ended", { state: "ended" }, {}, "ended", "none", "Ended"),
  c("a stopped ticket is ended", { state: "stopped" }, {}, "ended", "none", "Ended"),
  c("ended wins over everything else", { state: "stopped" }, { undelivered: {}, attention: {}, report: report("ready"), assignment: running }, "ended", "none", "Ended"),
  c("an input that could not be delivered waits for a person", open, { undelivered: {} }, "person", "delivery", "Input undelivered"),
  c("undelivered wins over a question and a ready report", open, { undelivered: {}, attention: {}, report: report("ready") }, "person", "delivery", "Input undelivered"),
  c("an open question waits for an answer", open, { attention: {} }, "person", "answer", "Awaiting answer"),
  c("a question wins over a ready report", open, { attention: {}, report: report("ready") }, "person", "answer", "Awaiting answer"),
  c("a ready report waits for review", open, { report: report("ready") }, "person", "review", "Awaiting review"),
  c("ready waits for review with the executor still running", open, { report: report("ready"), assignment: running }, "person", "review", "Awaiting review"),
  c("a blocked report waits for a person", open, { report: report("blocked"), assignment: running }, "person", "blocked", /blocked/i),
  c("a failed report waits for a person", open, { report: report("failed"), assignment: running }, "person", "failed", /failed/i),
  c("a blocked report with a person's message after it is no longer waiting: working", open, { report: report("blocked", 5n), person: { seq: 6n }, assignment: running }, "working", "none", "Working"),
  c("a failed report with a person's message after it, and no seat yet, is queued", open, { report: report("failed", 5n), person: { seq: 6n } }, "working", "queued", "Queued"),
  c("a blocked report with only an earlier message of a person's still waits", open, { report: report("blocked", 5n), person: { seq: 4n }, assignment: running }, "person", "blocked", /blocked/i),
  c("a blocked report waits for a person before any seat is given", open, { report: report("blocked") }, "person", "blocked", /blocked/i),
  c("a blocked report waits for a person while its assignment is pending", open, { report: report("blocked"), assignment: { state: "pending" } }, "person", "blocked", /blocked/i),
  c("a blocked report waits for a person after its assignment ended", open, { report: report("blocked"), assignment: { state: "ended" } }, "person", "blocked", /blocked/i),
  c("a failed report waits for a person after its assignment ended", open, { report: report("failed"), assignment: { state: "ended" } }, "person", "failed", /failed/i),
  c("a person's later message does not clear a ready report: it still waits for review", open, { report: report("ready", 5n), person: { seq: 6n }, assignment: running }, "person", "review", "Awaiting review"),
  c("a person's later message does not clear a question: it still waits for an answer", open, { attention: {}, person: { seq: 6n }, assignment: running }, "person", "answer", "Awaiting answer"),
  c("no assignment is queued", open, {}, "working", "queued", "Queued"),
  c("a waiting report with no assignment yet is queued", open, { report: report("waiting") }, "working", "queued", "Queued"),
  c("a waiting report with a pending assignment is queued", open, { report: report("waiting"), assignment: { state: "pending" } }, "working", "queued", "Queued"),
  c("a pending assignment is queued", open, { assignment: { state: "pending" } }, "working", "queued", "Queued"),
  c("a pending assignment with a progress report is queued", open, { assignment: { state: "pending" }, report: report("progress") }, "working", "queued", "Queued"),
  c("a waiting report with the executor running waits for a trigger", open, { report: report("waiting"), assignment: running }, "idle", "none", "Waiting for a Trigger"),
  c("an ended assignment waits for a trigger", open, { assignment: { state: "ended" } }, "idle", "none", "Waiting for a Trigger"),
  c("an ended assignment after a progress report waits for a trigger", open, { assignment: { state: "ended" }, report: report("progress") }, "idle", "none", "Waiting for a Trigger"),
  c("a running assignment is working", open, { assignment: running }, "working", "none", "Working"),
  c("a running assignment with a progress report is working", open, { assignment: running, report: report("progress") }, "working", "none", "Working"),
  c("a closing assignment does not hide a ready report", open, { assignment: { state: "closing" }, report: report("ready") }, "person", "review", "Awaiting review"),
  c("a closing assignment does not hide a question", open, { assignment: { state: "closing" }, attention: {} }, "person", "answer", "Awaiting answer"),
  // GOAL17-stage-one, call 6: a closing assignment is work in motion, named Stopping, and nobody is waited for.
  c("an assignment that is closing is named as stopping, and is nobody's wait", open, { assignment: { state: "closing" } }, "working", "none", "Stopping"),
];

/** What is wrong with a table: one sentence per case it gets wrong. Empty when it is right on every case. */
const problemsOf = (stageOf: StageOf, cases: ReadonlyArray<Case> = CASES): ReadonlyArray<string> =>
  cases.flatMap((k) => {
    const got = stageOf(k.ticket, k.facts);
    const label = typeof k.want.label === "string" ? got.label === k.want.label : k.want.label.test(got.label);
    return among(k.want.stage, got.stage) && among(k.want.why, got.why) && label ? [] : [`${k.name}: expected ${String(k.want.stage)}/${String(k.want.why)}/${String(k.want.label)}, got ${got.stage}/${got.why}/${got.label}`];
  });

const row = (stage: Stage, why: Why, label: string): Row => ({ stage, why, label });
/** The record's table, written again from the record: `GOAL17-derived-reads.md`, "stageOf", with `closing` named as stopping. */
const reference: StageOf = (t, f) => {
  const blockedSince = (f.report?.state === "blocked" || f.report?.state === "failed") && !(f.person !== undefined && f.person.seq > f.report.seq);
  return t.state !== "open" ? row("ended", "none", "Ended")
    : f.undelivered !== undefined ? row("person", "delivery", "Input undelivered")
    : f.attention !== undefined ? row("person", "answer", "Awaiting answer")
    : f.report?.state === "ready" ? row("person", "review", "Awaiting review")
    : blockedSince ? row("person", f.report?.state === "failed" ? "failed" : "blocked", f.report?.state === "failed" ? "Failed" : "Blocked")
    : f.assignment === undefined || f.assignment.state === "pending" ? row("working", "queued", "Queued")
    : f.assignment.state === "closing" ? row("working", "none", "Stopping")
    : f.report?.state === "waiting" || f.assignment.state === "ended" ? row("idle", "none", "Waiting for a Trigger")
    : row("working", "none", "Working");
};

describe("20 the stage table: controls", () => {
  it("the reference table, written from the record, is right on every case", () => {
    expect(problemsOf(reference)).toEqual([]);
  });

  const planted: ReadonlyArray<readonly [string, StageOf]> = [
    ["two rows swapped: a question before an undelivered input", (t, f) => (t.state === "open" && f.attention !== undefined ? row("person", "answer", "Awaiting answer") : reference(t, f))],
    ["two rows swapped: a ready report before a question", (t, f) => (t.state === "open" && f.attention !== undefined && f.report?.state === "ready" ? row("person", "review", "Awaiting review") : reference(t, f))],
    ["ended is not first: a stopped ticket with a question waits for an answer", (t, f) => (f.attention !== undefined ? row("person", "answer", "Awaiting answer") : reference(t, f))],
    ["a row dropped: an undelivered input is not noticed", (t, f) => reference(t, { ...f, undelivered: undefined })],
    ["a row dropped: a ready report is not noticed", (t, f) => reference(t, { ...f, report: f.report?.state === "ready" ? undefined : f.report })],
    ["a row dropped: an ended assignment is working", (t, f) => (t.state === "open" && f.assignment?.state === "ended" && f.report === undefined ? row("working", "none", "Working") : reference(t, f))],
    ["a wrong why: a failed report is blocked", (t, f) => { const r = reference(t, f); return r.why === "failed" ? { ...r, why: "blocked" } : r; }],
    ["a wrong why: a pending assignment has no reason", (t, f) => { const r = reference(t, f); return r.why === "queued" ? { ...r, why: "none" } : r; }],
    ["a wrong stage: a ready report is idle", (t, f) => { const r = reference(t, f); return r.why === "review" ? { ...r, stage: "idle" } : r; }],
    ["a wrong stage: a stopped ticket is idle", (t, f) => { const r = reference(t, f); return r.stage === "ended" ? { ...r, stage: "idle" } : r; }],
    ["a wrong label: queued says working", (t, f) => { const r = reference(t, f); return r.why === "queued" ? { ...r, label: "Working" } : r; }],
    ["a person's later message does not clear a block", (t, f) => reference(t, { ...f, person: undefined })],
    ["any message of a person's clears a block, even an earlier one", (t, f) => reference(t, f.person === undefined ? f : { ...f, person: { seq: 999n } })],
    ["a closing assignment is just working", (t, f) => (f.assignment?.state === "closing" ? row("working", "none", "Working") : reference(t, f))],
    ["a closing assignment waits for a person", (t, f) => (t.state === "open" && f.assignment?.state === "closing" ? row("person", "none", "Stopping") : reference(t, f))],
    ["blocked checked after the queued row: a blocked report with no seat is queued", (t, f) => (t.state === "open" && f.report?.state === "blocked" && (f.assignment === undefined || f.assignment.state === "pending") ? row("working", "queued", "Queued") : reference(t, f))],
    ["blocked checked after the idle row: a blocked report after its assignment ended waits for a trigger", (t, f) => (t.state === "open" && f.report?.state === "blocked" && f.assignment?.state === "ended" ? row("idle", "none", "Waiting for a Trigger") : reference(t, f))],
    ["the waiting report checked before the queued row: it is idle with no seat", (t, f) => (t.state === "open" && f.report?.state === "waiting" && (f.assignment === undefined || f.assignment.state === "pending") ? row("idle", "none", "Waiting for a Trigger") : reference(t, f))],
    ["a person's later message clears a ready report", (t, f) => reference(t, f.report?.state === "ready" && f.person !== undefined ? { ...f, report: undefined } : f)],
    ["a person's later message clears a question", (t, f) => reference(t, f.attention !== undefined && f.person !== undefined ? { ...f, attention: undefined } : f)],
    ["a closing row that is idle and queued, as call 6 does not say", (t, f) => (t.state === "open" && f.assignment?.state === "closing" && f.report === undefined && f.attention === undefined ? row("idle", "queued", "Stopping") : reference(t, f))],
    ["a closing row above the ready report and the question", (t, f) => (t.state === "open" && f.assignment?.state === "closing" ? row("working", "none", "Stopping") : reference(t, f))],
    ["everything is working", () => row("working", "none", "Working")],
  ];
  it.each(planted)("a table with %s is refused", (_why, table) => {
    expect(problemsOf(table)).not.toEqual([]);
  });
});

describe("20 the stage table: the app's stageOf", async () => {
  const mod = (await import(/* @vite-ignore */ pathToFileURL(join(superagent, "plugins/tickets/src/modules/stage/service.ts")).href)) as { readonly stageOf: StageOf };
  const rows = CASES.filter((k) => !k.name.includes("closing"));

  it("is right on every row and every pair of rows that decides which wins", () => {
    expect(problemsOf(mod.stageOf, rows)).toEqual([]);
  });

  it("names an assignment that is closing as stopping", () => {
    expect(problemsOf(mod.stageOf, CASES.filter((k) => k.name.includes("closing")))).toEqual([]);
  });
});
