// Check 05 (M4.10, Gate M4 item 1): the gate's journey, the request key, the closed values and the pool judge every step.
// Planted copies of "the support agent spends for bob", "the same key starts one run", "the loop closes a run with closed
// values" and "a full pool refuses", each wrong in one place, must each fail at exactly that step and pass the others
// (`failedAt`). The gate's plants cover the tools offered (one added, one missing), the spend (amount, what is left, which
// allowance), the way every call is made (as whom, for whom, refused or not) and the refusal of an operation marked
// `.notVia(Via.agent)` (not refused, or by a session instead of an agent key); the closed values' plants change one word
// of the lists the journey loops over, and the refusal that each wrong caller gets.
//
// The true journeys are left out of this run: only planted copies run, so every ✘ here is a planted one.
// Red today: the fixture does not load (no `@orthograph/agents`), so nothing proves.
import { afterAll, describe, expect, it } from "vitest";
import { allFailedAtTheirStep, JOURNEYS, nothingRunning, once, provePlanted, shop, type Plant } from "./support.ts";

const { gate, key, closed, pool } = JOURNEYS;
const planted = shop("support");
afterAll(() => planted.remove());

const OFFERED = "the run was offered the allowance tools and not invitation.accept";
const SPENT = "it ends, and 120 came out of bob's allowance";
const CALLS = "every call it made was as an agent for bob, and none was refused";
const READ = "read back, 120 is spent";
const AGENT_KEY_READ = "the same agent key reads bob's allowance: it is refused only what is marked, not everything";
const AGENT_KEY = "an agent key for bob is refused invitation.accept, and the invitation stays pending";
const REPLAY = "the same start again answers the same run and starts nothing";
const ONE = "she has one run, and it is the one the replay answered";
const SHE_HAS = "she still has two runs working and no third";
const NOT_STEER = "ada can't finish her own run";
const THIRD = "a third is refused: the pool is full";

const cases: ReadonlyArray<Plant> = [
  // the support agent spends for bob
  ["gate-offers-accept", gate, OFFERED, [['["allowance.get", "allowance.mine", "allowance.spend"]', '["allowance.get", "allowance.mine", "allowance.spend", "invitation.accept"]']]],
  ["gate-offers-no-get", gate, OFFERED, [['["allowance.get", "allowance.mine", "allowance.spend"]', '["allowance.mine", "allowance.spend"]']]],
  ["gate-offers-revoke", gate, OFFERED, [['["allowance.get", "allowance.mine", "allowance.spend"]', '["allowance.get", "allowance.mine", "allowance.revoke", "allowance.spend"]']]],
  ["gate-amount", gate, SPENT, [["amount: 120n, remaining: 380n", "amount: 121n, remaining: 380n"]]],
  ["gate-remaining", gate, SPENT, [["amount: 120n, remaining: 380n", "amount: 120n, remaining: 379n"]]],
  ["gate-allowance", gate, SPENT, [["allowance: s.world.allowance, amount: 120n", "allowance: s.world.organization, amount: 120n"]]],
  ["gate-refused", gate, CALLS, [['"allowance.spend agent ok"]', '"allowance.spend agent refused NotAllowed"]']]],
  ["gate-as-session", gate, CALLS, [['"allowance.spend agent ok"]', '"allowance.spend session ok"]']]],
  ["gate-accept-called", gate, CALLS, [['"allowance.spend agent ok"]', '"allowance.spend agent ok", "invitation.accept agent refused NotAllowed"]']]],
  ["gate-for-ada", gate, CALLS, [["[s.bob.person, s.bob.person]", "[s.world.organization, s.bob.person]"]]],
  ["gate-nothing-spent", gate, READ, [['[500n, 120n, "active"]', '[500n, 0n, "active"]']]],
  ["gate-spent-twice", gate, READ, [['[500n, 120n, "active"]', '[500n, 240n, "active"]']]],
  ["gate-exhausted", gate, READ, [['[500n, 120n, "active"]', '[500n, 120n, "exhausted"]']]],
  ["gate-agent-key-spent", gate, AGENT_KEY_READ, [['s.bob.via(Via.agent).run(getAllowance, { id: s.world.allowance }),\n      expect((a) => [a.limit, a.spent, a.state]).toEqual([500n, 120n, "active"])', 's.bob.via(Via.agent).run(getAllowance, { id: s.world.allowance }),\n      expect((a) => [a.limit, a.spent, a.state]).toEqual([500n, 0n, "active"])']]],
  ["gate-accept-allowed", gate, AGENT_KEY, [["refuses(Blueprint.NotAllowed),\n      noEvents(),\n      invitation", "noEvents(),\n      invitation"]]],
  ["gate-accept-by-session", gate, AGENT_KEY, [["s.bob.via(Via.agent).run(accept", "s.bob.run(accept"]]],
  ["gate-accept-accepted", gate, AGENT_KEY, [['invitation.isIn(s.world.invitation, "pending")', 'invitation.isIn(s.world.invitation, "accepted")']]],
  // the same key starts one run
  ["key-event", key, "ada starts a run with the key claim-7", [["emits(RunStarted, { run: s.started.run })", "emits(RunStarted, { run: s.world.organization })"]]],
  ["key-replay-answer", key, REPLAY, [['expect((a) => typeof a.run).toBe("string")', 'expect((a) => typeof a.run).toBe("number")']]],
  ["key-replay-started", key, REPLAY, [["      noEvents(),", "      emits(RunStarted, { run: s.started.run }),"]]],
  ["key-two-rows", key, ONE, [[".toEqual([s.started.run])", ".toEqual([s.started.run, s.started.run])"]]],
  ["key-no-rows", key, ONE, [[".toEqual([s.started.run])", ".toEqual([])"]]],
  ["key-not-a-list", key, ONE, [[".toEqual([s.started.run])", ".toEqual(s.started.run)"]]],
  ["key-other-collapses", key, "another key is another run", [['key: "claim-8" }),\n      emits(RunStarted, { run: s.started.run }),', 'key: "claim-8" }),\n      noEvents(),']]],
  ["key-bob-has-one", key, "bob has none of them", [[".toBe(0)", ".toBe(1)"]]],
  ["key-agent-key-starts", key, "an agent key for ada can't start a run", [['key: "claim-9" }),\n      refuses(Blueprint.NotAllowed),', 'key: "claim-9" }),']]],
  ["key-two-runs", key, "she has two runs", [[".toBe(2)", ".toBe(1)"]]],
  ["key-three-runs", key, "she has two runs", [[".toBe(2)", ".toBe(3)"]]],
  // the loop closes a run with closed values: one word of each list, one flag, the field and the caller
  ["closed-outcome-merged", closed, "the loop finishes a run as merged", [['"reviewed"', '"merged"']]],
  ["closed-reason-budgets", closed, "the loop fails a run for budgets, and it is not transient", [['["budget", false]', '["budgets", false]']]],
  ["closed-model-not-transient", closed, "the loop fails a run for model, and it is not transient", [['["model", true]', '["model", false]']]],
  ["closed-refused-transient", closed, "the loop fails a run for refused, and it is transient", [['["refused", false]', '["refused", true]']]],
  ["closed-case-field", closed, "the loop can't finish it with a word of the four in another case", [['outcome: "Answered" as never, spent: 0n }), refuses(Blueprint.InvalidPayload, { field: "outcome" })', 'outcome: "Answered" as never, spent: 0n }), refuses(Blueprint.InvalidPayload, { field: "reason" })']]],
  ["closed-timeout-field", closed, "the loop can't fail it with a plausible word that is not one of the seven", [['reason: "timeout" as never }), refuses(Blueprint.InvalidPayload, { field: "reason" })', 'reason: "timeout" as never }), refuses(Blueprint.InvalidPayload, { field: "outcome" })']]],
  ["closed-ada-finish-other", closed, NOT_STEER, [["refuses(Blueprint.NotAllowed)", 'refuses(Blueprint.InvalidPayload, { field: "outcome" })']]],
  ["closed-ada-fail-allowed", closed, "ada can't fail her own run", [['reason: "crash" }), refuses(Blueprint.NotAllowed), ', 'reason: "crash" }), ']]],
  ["closed-outcome-field", closed, "the loop can't finish it with a word outside the four", [['{ field: "outcome" }', '{ field: "reason" }']]],
  ["closed-reason-field", closed, "the loop can't fail it with a word outside the seven", [['{ field: "reason" }', '{ field: "outcome" }']]],
  // a full pool refuses
  ["pool-third-allowed", pool, THIRD, [['run("pool-3")), refuses(RunPoolFull), noEvents()', 'run("pool-3")), noEvents()']]],
  ["pool-third-other-refusal", pool, THIRD, [['run("pool-3")), refuses(RunPoolFull), noEvents()', 'run("pool-3")), refuses(Blueprint.NotAllowed), noEvents()']]],
  ["pool-one-working", pool, SHE_HAS, [['["working", "working"]', '["working"]']]],
  ["pool-three-working", pool, SHE_HAS, [['["working", "working"]', '["working", "working", "working"]']]],
  ["pool-one-cancelled", pool, SHE_HAS, [['["working", "working"]', '["working", "cancelled"]']]],
  ["pool-cancel-refused", pool, "she cancels the second", [["s.ada.run(cancel, { run: s.started.run }))", "s.ada.run(cancel, { run: s.started.run }), refuses(Blueprint.NotAllowed))"]]],
  ["pool-freed-slot-refused", pool, "a third start, with a new key, now works", [['run("pool-5")), emits(RunStarted, { run: s.started.run })', 'run("pool-5")), refuses(RunPoolFull)']]],
  ["pool-fourth-admitted", pool, "a fourth is refused: it is full again", [['run("pool-4")), refuses(RunPoolFull), noEvents()', 'run("pool-4")), emits(RunStarted, { run: s.started.run })']]],
];

const proved = once(() => provePlanted(planted.root, cases));

describe("05 M4.10: the gate's journey, the key, the closed values and the pool judge every step", () => {
  it("each planted wrong journey fails exactly its own step, and the other steps pass", () => {
    const { run, named } = proved();
    allFailedAtTheirStep(run, named);
    expect(run.status, run.out).toBe(1);
  });

  it("the planted run leaves nothing running", () => {
    proved();
    nothingRunning(planted.root);
  });
});
