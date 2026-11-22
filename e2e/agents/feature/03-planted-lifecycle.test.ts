// Check 03 (M4.10): the lifecycle journeys judge every step. Planted copies of "a run starts and reads back", "steering
// reaches the transcript", "cancelling stops the tools" and "a spent budget fails the run", each wrong in one place (one
// field read back wrong, one event field wrong, one list longer, shorter or another type, one expected event that
// never comes), must each fail at exactly that step and pass the others (`failedAt`): a prove that marks steps passed
// without judging them, or a run that satisfies only the first answer, fails here. What each journey reads is listed in
// the pull request's hollow-pass table; every row of it is one case below.
//
// The true journeys are left out of this run: only planted copies run, so every ✘ here is a planted one.
// Red today: the fixture does not load (no `@orthograph/agents`), so nothing proves.
import { afterAll, describe, expect, it } from "vitest";
import { allFailedAtTheirStep, JOURNEYS, nothingRunning, once, provePlanted, shop, type Plant } from "./support.ts";

const { starts, steers, cancels, budget } = JOURNEYS;
const planted = shop("support");
afterAll(() => planted.remove());

const HELD = "the stand-in model is held";
const START = "ada starts a notes run with a budget of 100";
const READ = "read back, it is working with nothing spent";
const QUIET = "the world goes quiet, with nothing emitted and the run still cancelled";
const SUPPORT = ['import notes from "../blueprint/agents/notes.ts";', 'import notes from "../blueprint/agents/notes.ts";\nimport support from "../blueprint/agents/support.ts";'] as const;

const cases: ReadonlyArray<Plant> = [
  // a run starts and reads back: each field the start's event and the read-back carry, each state, the hold and the release
  ["starts-held", starts, HELD, [["expect((a) => a.held).toBe(true)", "expect((a) => a.held).toBe(false)"]]],
  ["starts-starter", starts, START, [["starter: s.ada.person }", "starter: s.world.organization }"]]],
  ["starts-model", starts, START, [["model: Models.standIn, starter", 'model: "other", starter']]],
  ["starts-agent", starts, START, [SUPPORT, ["agent: notes, model: Models.standIn, starter", "agent: support, model: Models.standIn, starter"]]],
  ["starts-waiting", starts, START, [['machine.isIn(s.started.run, "working"),\n      spans', 'machine.isIn(s.started.run, "waiting"),\n      spans']]],
  ["starts-span", starts, START, [['spans({ present: ["run.start"] })', 'spans({ present: ["run.start", "run.nothing"] })']]],
  ["read-state", starts, READ, [['0n, "working"]', '0n, "waiting"]']]],
  ["read-spent", starts, READ, [['100n, 0n, "working"]', '100n, 1n, "working"]']]],
  ["read-budget", starts, READ, [['"say hello", 100n, 0n', '"say hello", 99n, 0n']]],
  ["read-model", starts, READ, [['["notes", Models.standIn,', '["notes", "other",']]],
  ["read-agent", starts, READ, [['["notes", Models.standIn,', '["desk", Models.standIn,']]],
  ["read-brief", starts, READ, [['Models.standIn, "say hello", 100n', 'Models.standIn, "say goodbye", 100n']]],
  ["released-held", starts, "the model answers", [["expect((a) => a.held).toBe(false)", "expect((a) => a.held).toBe(true)"]]],
  ["finish-outcome", starts, "the run finishes as answered", [['outcome: "answered", spent: 2n }', 'outcome: "pushed", spent: 2n }']]],
  ["finish-spent", starts, "the run finishes as answered", [['outcome: "answered", spent: 2n }', 'outcome: "answered", spent: 4n }']]],
  ["done-spent", starts, "read back, it is done with one reply paid for", [['[2n, "done"]', '[4n, "done"]']]],
  ["done-state", starts, "read back, it is done with one reply paid for", [['[2n, "done"]', '[2n, "failed"]']]],
  ["done-cancellable", starts, "a finished run can't be cancelled", [['{ state: "done" }', '{ state: "working" }']]],
  ["done-cancelled", starts, "a finished run can't be cancelled", [['refuses(machine.notFrom, { state: "done" }),\n      noEvents(),', "noEvents(),"]]],
  // steering reaches the transcript: the note in the event, the transcript's length, order and type
  ["steers-event-note", steers, "ada steers it and it is still working", [['RunSteered, { run: s.started.run, note: "use the remaining field" }', 'RunSteered, { run: s.started.run, note: "use the remaining fields" }']]],
  ["steers-quiet", steers, "ada steers it and it is still working", [['import { Blueprint, emits, expect } from "orthograph";', 'import { Blueprint, emits, expect, noEvents } from "orthograph";'], ['note: "use the remaining field" }),\n      emits(', 'note: "use the remaining field" }),\n      noEvents(),\n      emits(']]],
  ["transcript-empty", steers, "the transcript has her note", [['.toEqual(["use the remaining field"])', ".toEqual([])"]]],
  ["transcript-doubled", steers, "the transcript has her note", [['.toEqual(["use the remaining field"])', '.toEqual(["use the remaining field", "use the remaining field"])']]],
  ["transcript-wider", steers, "the transcript has her note", [['.toEqual(["use the remaining field"])', '.toEqual("use the remaining field")']]],
  ["steers-second-note", steers, "a second note is kept after the first", [['note: "and keep it short" }),\n    ),', 'note: "and keep it long" }),\n    ),']]],
  ["transcript-order", steers, "the transcript has both notes in order", [['["use the remaining field", "and keep it short"])', '["and keep it short", "use the remaining field"])']]],
  ["steers-read-state", steers, "read back, the brief is hers and the run is working", [['"list the files", "working"]', '"list the files", "waiting"]']]],
  ["steers-read-brief", steers, "read back, the brief is hers and the run is working", [['"list the files", "working"]', '"list some files", "working"]']]],
  ["transcript-last-only", steers, "the transcript has both notes in order", [['["use the remaining field", "and keep it short"])', '["and keep it short"])']]],
  // cancelling stops the tools: the move, the event's run, a quiet world after, tools, requests, the read-back
  ["cancels-state", cancels, "bob cancels it: cancelled, and said so", [['machine.isIn(s.started.run, "cancelled")', 'machine.isIn(s.started.run, "failed")']]],
  ["cancels-event-run", cancels, "bob cancels it: cancelled, and said so", [["emits(RunCancelled, { run: s.started.run })", "emits(RunCancelled, { run: s.world.organization })"]]],
  ["cancels-late-event", cancels, QUIET, [["s.world.quiet(),\n      noEvents(),", "s.world.quiet(),\n      emits(RunCancelled, { run: s.started.run }),"]]],
  ["cancels-late-state", cancels, QUIET, [['s.world.quiet(),\n      noEvents(),\n      machine.isIn(s.started.run, "cancelled")', 's.world.quiet(),\n      noEvents(),\n      machine.isIn(s.started.run, "failed")']]],
  ["cancels-late-held", cancels, "the model answers late", [["expect((a) => a.held).toBe(false)", "expect((a) => a.held).toBe(true)"]]],
  ["cancels-spent-allowance", cancels, "and nothing came out of his allowance", [['[0n, "active"]', '[120n, "active"]']]],
  ["cancels-revoked-allowance", cancels, "and nothing came out of his allowance", [['[0n, "active"]', '[0n, "revoked"]']]],
  ["cancels-tool-ran", cancels, "no tool ran", [["expect((a) => a.calls).toEqual([])", 'expect((a) => a.calls).toEqual([{ name: "allowance.mine" }])']]],
  ["cancels-requests", cancels, "one request was ever sent, and the run is still cancelled", [["[1, []]", "[2, []]"]]],
  ["cancels-repeat", cancels, "one request was ever sent, and the run is still cancelled", [["[1, []]", "[1, [1]]"]]],
  ["cancels-read-state", cancels, "read back, it is cancelled with nothing spent", [['["cancelled", 0n]', '["failed", 0n]']]],
  ["cancels-read-spent", cancels, "read back, it is cancelled with nothing spent", [['["cancelled", 0n]', '["cancelled", 2n]']]],
  // a spent budget fails the run: the reason, transient, the requests, the read-back, and the looser budget's outcome and spend
  ["budget-reason", budget, "it fails for its budget and will not be retried", [['reason: "budget", transient: false', 'reason: "turns", transient: false']]],
  ["budget-transient", budget, "it fails for its budget and will not be retried", [['reason: "budget", transient: false', 'reason: "budget", transient: true']]],
  ["budget-tool-reason", budget, "it fails for its budget after one request", [['machine.isIn(s.started.run, "failed")),\n      emits(RunFailed, { run: s.started.run, reason: "budget", transient: false }),\n    ),\n    s.step(\n      "read back, it spent 2', 'machine.isIn(s.started.run, "failed")),\n      emits(RunFailed, { run: s.started.run, reason: "turns", transient: false }),\n    ),\n    s.step(\n      "read back, it spent 2']]],
  ["budget-tool-over", budget, "read back, it spent 2 of a budget of 3", [['["failed", 3n, 2n]', '["failed", 3n, 4n]']]],
  ["budget-tool-unspent", budget, "read back, it spent 2 of a budget of 3", [['["failed", 3n, 2n]', '["failed", 3n, 0n]']]],
  ["budget-sent", budget, "no request was sent and nothing was spent", [["[0, []]", "[1, []]"]]],
  ["budget-over", budget, "read back, it spent 0 of a budget of 1", [['["failed", 1n, 0n]', '["failed", 1n, 2n]']]],
  ["budget-state", budget, "read back, it spent 0 of a budget of 1", [['["failed", 1n, 0n]', '["done", 1n, 0n]']]],
  ["budget-loose-outcome", budget, "it pays for its one reply and finishes with 2 spent", [['outcome: "answered", spent: 2n }', 'outcome: "blocked", spent: 2n }']]],
  ["budget-loose-spent", budget, "it pays for its one reply and finishes with 2 spent", [['outcome: "answered", spent: 2n }', 'outcome: "answered", spent: 3n }']]],
];

const proved = once(() => provePlanted(planted.root, cases));

describe("03 M4.10: the lifecycle journeys judge every step", () => {
  it("each planted wrong lifecycle journey fails exactly its own step, and the other steps pass", () => {
    const { run, named } = proved();
    allFailedAtTheirStep(run, named);
    expect(run.status, run.out).toBe(1);
  });

  it("the planted run leaves nothing running", () => {
    proved();
    nothingRunning(planted.root);
  });
});
