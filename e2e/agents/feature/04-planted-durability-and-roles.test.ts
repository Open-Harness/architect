// Check 04 (M4.10, M4.09): the eviction and role journeys judge every step. Planted copies of the two eviction journeys
// (M4-agents call 3), "only the starter steers or cancels" and "an agent is refused what its person is refused", each
// wrong in one place, must each fail at exactly that step and pass the others (`failedAt`). The eviction plants cover
// every way a count can be wrong (one more, one fewer, a repeat where none is allowed, no repeat where one is, a
// committed reply asked for twice, usage that starts again or counts twice); the role plants cover who is refused, with
// which refusal, and who is let through.
//
// The true journeys are left out of this run: only planted copies run, so every ✘ here is a planted one.
// Red today: the fixture does not load (no `@orthograph/agents`), so nothing proves.
import { afterAll, describe, expect, it } from "vitest";
import { allFailedAtTheirStep, JOURNEYS, nothingRunning, once, provePlanted, shop, type Plant } from "./support.ts";

const { evictTool, evictModel, starter, person } = JOURNEYS;
const planted = shop("support");
afterAll(() => planted.remove());

const TOOL_EVICT = "the world evicts the run's host after its first reply committed and before its tool did";
const TOOL_REQUESTS = "the stand-in saw two requests and none twice";
const MODEL_REQUESTS = "the stand-in saw two requests: the first twice, and no more";
const NO_STEER = "bob can't steer it";
const NO_CANCEL = "bob can't cancel it";
const BOB_REVOKE = "its revoke was made as an agent for bob and refused, and the allowance is active";
const ADA_REVOKE = "its revoke was made as an agent for ada and went through";

const cases: ReadonlyArray<Plant> = [
  // eviction in the tool phase: no extra request, none twice, usage carries on, one trace
  ["tool-event", evictTool, "bob starts a support run that reads his allowances once", [["RunStarted, { run: s.started.run }", "RunStarted, { run: s.world.organization }"]]],
  ["tool-phase", evictTool, TOOL_EVICT, [['["tool", 1]', '["model", 1]']]],
  ["tool-committed", evictTool, TOOL_EVICT, [['["tool", 1]', '["tool", 0]']]],
  ["tool-held-tool", evictTool, "the next tool call is held", [["a.heldTool).toBe(true)", "a.heldTool).toBe(false)"]]],
  ["tool-outcome", evictTool, "it resumes under the same id and finishes", [['outcome: "answered", spent: 4n }', 'outcome: "pushed", spent: 4n }']]],
  ["tool-finish-spent", evictTool, "it resumes under the same id and finishes", [['outcome: "answered", spent: 4n }', 'outcome: "answered", spent: 2n }']]],
  ["tool-ran-twice", evictTool, "the tool ran once, as an agent for bob, and was not run again", [['.toEqual(["allowance.mine agent ok"])', '.toEqual(["allowance.mine agent ok", "allowance.mine agent ok"])']]],
  ["tool-never-ran", evictTool, "the tool ran once, as an agent for bob, and was not run again", [['.toEqual(["allowance.mine agent ok"])', ".toEqual([])"]]],
  ["tool-one-host", evictTool, "the run lived in two hosts: the one evicted and the one that resumed it", [["a.started).toBe(2)", "a.started).toBe(1)"]]],
  ["tool-state", evictTool, "it resumes under the same id and finishes", [['machine.isIn(s.started.run, "done")', 'machine.isIn(s.started.run, "failed")']]],
  ["tool-extra-request", evictTool, TOOL_REQUESTS, [["[2, []]", "[3, []]"]]],
  ["tool-fewer-requests", evictTool, TOOL_REQUESTS, [["[2, []]", "[1, []]"]]],
  ["tool-repeated", evictTool, TOOL_REQUESTS, [["[2, []]", "[2, [1]]"]]],
  ["tool-usage-restarts", evictTool, "usage carries on: two replies, 4 cents", [["[2, 4n]", "[2, 2n]"]]],
  ["tool-usage-twice", evictTool, "usage carries on: two replies, 4 cents", [["[2, 4n]", "[2, 8n]"]]],
  ["tool-turns", evictTool, "usage carries on: two replies, 4 cents", [["[2, 4n]", "[1, 4n]"]]],
  ["tool-span", evictTool, "one trace holds the run and its turns", [['"agent.tool.allowance.mine"]', '"agent.tool.allowance.mine", "agent.nothing"]']]],
  ["tool-two-traces", evictTool, "one trace holds the run and its turns", [["expect((a) => a.traces).toBe(1)", "expect((a) => a.traces).toBe(2)"]]],
  // eviction with a reply held: exactly one repeat, of that one request, and one reply paid for
  ["model-phase", evictModel, "the world evicts the run's host while its request is in flight", [['["model", 0]', '["tool", 0]']]],
  ["model-committed", evictModel, "the world evicts the run's host while its request is in flight", [['["model", 0]', '["model", 1]']]],
  ["model-outcome", evictModel, "it finishes under the same id", [['outcome: "answered", spent: 2n }', 'outcome: "blocked", spent: 2n }']]],
  ["model-finish-spent", evictModel, "it finishes under the same id", [['outcome: "answered", spent: 2n }', 'outcome: "answered", spent: 4n }']]],
  ["model-one-host", evictModel, "the run lived in two hosts: the one evicted and the one that resumed it", [["a.started).toBe(2)", "a.started).toBe(1)"]]],
  ["model-no-repeat", evictModel, MODEL_REQUESTS, [["[2, [1]]", "[2, []]"]]],
  ["model-repeated-twice", evictModel, MODEL_REQUESTS, [["[2, [1]]", "[2, [1, 1]]"]]],
  ["model-extra-request", evictModel, MODEL_REQUESTS, [["[2, [1]]", "[3, [1]]"]]],
  ["model-other-request", evictModel, MODEL_REQUESTS, [["[2, [1]]", "[2, [2]]"]]],
  ["model-fewer-requests", evictModel, MODEL_REQUESTS, [["[2, [1]]", "[1, [1]]"]]],
  ["model-paid-twice", evictModel, "one reply is paid for: 2 cents", [["[1, 2n]", "[1, 4n]"]]],
  ["model-two-replies", evictModel, "one reply is paid for: 2 cents", [["[1, 2n]", "[2, 2n]"]]],
  // only the starter steers or cancels
  ["starter-steer-allowed", starter, NO_STEER, [["note: \"do it my way\" }),\n      refuses(Blueprint.NotAllowed),", "note: \"do it my way\" }),"]]],
  ["starter-steer-other-refusal", starter, NO_STEER, [["refuses(Blueprint.NotAllowed)", 'refuses(machine.notFrom, { state: "working" })']]],
  ["starter-steer-cancelled", starter, NO_STEER, [['refuses(Blueprint.NotAllowed),\n      noEvents(),\n      machine.isIn(s.started.run, "working"),\n    ),\n    s.step(\n      "the transcript', 'refuses(Blueprint.NotAllowed),\n      noEvents(),\n      machine.isIn(s.started.run, "cancelled"),\n    ),\n    s.step(\n      "the transcript']]],
  ["starter-transcript-note", starter, "the transcript has no note of his", [[".toEqual([])", '.toEqual(["do it my way"])']]],
  ["starter-cancel-allowed", starter, NO_CANCEL, [["s.bob.run(cancel, { run: s.started.run }),\n      refuses(Blueprint.NotAllowed),", "s.bob.run(cancel, { run: s.started.run }),"]]],
  ["starter-cancel-state", starter, NO_CANCEL, [['s.bob.run(cancel, { run: s.started.run }),\n      refuses(Blueprint.NotAllowed),\n      noEvents(),\n      machine.isIn(s.started.run, "working"),', 's.bob.run(cancel, { run: s.started.run }),\n      refuses(Blueprint.NotAllowed),\n      noEvents(),\n      machine.isIn(s.started.run, "cancelled"),']]],
  ["starter-ada-event", starter, "ada can: cancelled", [["emits(RunCancelled, { run: s.started.run })", "emits(RunCancelled, { run: s.world.organization })"]]],
  ["starter-ada-state", starter, "ada can: cancelled", [['machine.isIn(s.started.run, "cancelled")', 'machine.isIn(s.started.run, "working")']]],
  // an agent is refused what its person is refused
  ["person-run-failed", person, "the run ends", [['machine.isIn(s.started.run, "done")', 'machine.isIn(s.started.run, "failed")']]],
  ["person-offered-fewer", person, "it was offered the two operations the desk lists", [['["allowance.mine", "allowance.revoke"]', '["allowance.mine"]']]],
  ["person-offered-more", person, "it was offered the two operations the desk lists", [['["allowance.mine", "allowance.revoke"]', '["allowance.get", "allowance.mine", "allowance.revoke"]']]],
  ["person-revoke-ok", person, BOB_REVOKE, [['"allowance.revoke agent refused NotAllowed"', '"allowance.revoke agent ok"']]],
  ["person-revoke-as-user", person, BOB_REVOKE, [['"allowance.revoke agent refused NotAllowed"', '"allowance.revoke user refused NotAllowed"']]],
  ["person-revoke-other-refusal", person, BOB_REVOKE, [['"allowance.revoke agent refused NotAllowed"', '"allowance.revoke agent refused NotFound"']]],
  ["person-no-mine", person, BOB_REVOKE, [['["allowance.mine agent ok", "allowance.revoke agent refused NotAllowed"]', '["allowance.revoke agent refused NotAllowed"]']]],
  ["person-revoke-twice", person, BOB_REVOKE, [['["allowance.mine agent ok", "allowance.revoke agent refused NotAllowed"]', '["allowance.mine agent ok", "allowance.revoke agent refused NotAllowed", "allowance.revoke agent refused NotAllowed"]']]],
  ["person-for-ada", person, BOB_REVOKE, [["[s.bob.person, s.bob.person]", "[s.ada.person, s.bob.person]"]]],
  ["person-allowance-revoked", person, BOB_REVOKE, [['allowance.isIn(s.world.allowance, "active")', 'allowance.isIn(s.world.allowance, "revoked")']]],
  ["person-bob-allowed", person, "bob himself is refused the same way", [["refuses(Blueprint.NotAllowed),\n      allowance.isIn", "allowance.isIn"]]],
  ["person-bob-other-refusal", person, "bob himself is refused the same way", [["refuses(Blueprint.NotAllowed),\n      allowance.isIn", 'refuses(allowance.notFrom, { state: "active" }),\n      allowance.isIn']]],
  ["person-bob-revoked", person, "bob himself is refused the same way", [['refuses(Blueprint.NotAllowed),\n      allowance.isIn(s.world.allowance, "active")', 'refuses(Blueprint.NotAllowed),\n      allowance.isIn(s.world.allowance, "revoked")']]],
  ["person-ada-event", person, "it ends, and the allowance is revoked", [["emits(AllowanceRevoked, { allowance: s.world.allowance })", "emits(AllowanceRevoked, { allowance: s.world.organization })"]]],
  ["person-ada-active", person, "it ends, and the allowance is revoked", [['allowance.isIn(s.world.allowance, "revoked")', 'allowance.isIn(s.world.allowance, "active")']]],
  ["person-ada-refused", person, ADA_REVOKE, [['"allowance.revoke agent ok"]', '"allowance.revoke agent refused NotAllowed"]']]],
  ["person-ada-for-bob", person, ADA_REVOKE, [["[s.ada.person, s.ada.person]", "[s.bob.person, s.ada.person]"]]],
];

const proved = once(() => provePlanted(planted.root, cases));

describe("04 M4.10: the eviction and role journeys judge every step", () => {
  it("each planted wrong eviction or role journey fails exactly its own step, and the other steps pass", () => {
    const { run, named } = proved();
    allFailedAtTheirStep(run, named);
    expect(run.status, run.out).toBe(1);
  });

  it("the planted run leaves nothing running", () => {
    proved();
    nothingRunning(planted.root);
  });
});
