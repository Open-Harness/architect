// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// The prototype's `002`, "Policy version": a version change discards running evals and queues their triggers again.
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { PolicyChanged } from "@orthograph/intake/blueprint/things/policy/events.ts";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";

export default Blueprint.journey("a policy change restarts a live eval", {
  cast: { ada: Blueprint.signedIn },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent's first turn is held open", models.script({ for: { kind: "main" }, turns: [{ say: "Thinking.", hold: "before-reply" }, { say: "Looking again." }] })),
    s.step("the eval pass runs: one eval is told to the main agent", s.clock.advance("5 seconds")),
    s.step("the turn is open", models.held({ match: { nth: 1 }, count: 1 }), expect((a) => a.held.length).toBe(1)),
    s.step("ada saves a new version of the policy", s.ada.run(save, { superagent: s.world.superagent, base: 1n, mode: "auto", allowed: [], bots: [], admission: {}, rules: [] }),
      emits(PolicyChanged, { superagent: s.world.superagent, revision: 2n })),
    s.step("the model is let go", models.release({ hold: "all" })),
    s.step("the world settles past the next eval pass", s.clock.advance("5 seconds")),
    s.step("the trigger was queued again: a second eval started", outbox.rows({ name: "EvalStarted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
  ],
});
