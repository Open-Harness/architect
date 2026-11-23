// Checks-author file (Goal 17, slice 6). A builder never edits it.
// "`eval.due` batches each thread's waiting triggers into an Eval", "one eval at a time" per thread (the brief's spec table).
// Two threads wait, one with two triggers: a pass makes two evals, not three, and a second pass finds nothing waiting. A new
// trigger on a thread that is being evaluated waits (a pass starts nothing for it); a new thread's trigger starts one.
// The count `started` is all a journey can see of a pass: `eval.due` has no move of its own, so it emits nothing, and no read
// lists evals (what each holds waits on the harness: `e2e/superagent/README.md`, "Slice 6").
import { Blueprint, expect } from "orthograph";
import due from "@orthograph/intake/blueprint/things/eval/verbs/due.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

const mention = (superagent: unknown, event: string, ts: string, text: string) => ({
  superagent, source: "slack", event, thread: `C1:${ts}`, kind: "mention", text, author: "U1", channel: { channel: "C1", ts },
});

export default Blueprint.journey("an eval batches a thread", {
  cast: { clock: Blueprint.system },
  starts: "two-threads-are-waiting",
  steps: (s) => [
    s.step(
      "one pass makes one eval for each thread that waits: two, for three triggers",
      s.clock.run(due, { superagent: s.world.superagent }),
      expect((a) => a.started).toBe(2n),
    ),
    s.step(
      "a second pass starts nothing: each thread's eval is still running",
      s.clock.run(due, { superagent: s.world.superagent }),
      expect((a) => a.started).toBe(0n),
    ),
    s.step(
      "a new trigger arrives on a thread that is being evaluated: it is stored",
      s.clock.run(receive, mention(s.world.superagent, "EvA3", "5.1", "@agent also the date parser")),
      expect((a) => a.outcome).toBe("stored"),
    ),
    s.step(
      "it waits: a pass starts nothing while that thread's eval is running",
      s.clock.run(due, { superagent: s.world.superagent }),
      expect((a) => a.started).toBe(0n),
    ),
    s.step(
      "a trigger arrives on a third thread: it is stored",
      s.clock.run(receive, mention(s.world.superagent, "EvC1", "7.1", "@agent bump the node version")),
      expect((a) => a.outcome).toBe("stored"),
    ),
    s.step(
      "one pass makes one eval for the new thread only",
      s.clock.run(due, { superagent: s.world.superagent }),
      expect((a) => a.started).toBe(1n),
    ),
  ],
});
