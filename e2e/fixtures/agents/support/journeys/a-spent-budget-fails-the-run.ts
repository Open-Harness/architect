// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 4):
//   The stand-in prices every reply at 2 cents. Ada starts a notes run with a budget of 1 cent: it can't pay for even
//   one reply, so it fails with the reason `budget`, no request is ever sent, and it spent 0, which is not more than
//   the budget. It is a failure that is not worth retrying (`transient` is false). With a budget of 3 cents the same
//   run pays for its one reply and finishes with 2 spent: the budget is a limit, not a refusal to start. A support run
//   with 3 cents pays for its first reply (2) and not for the second (it would make 4): it fails `budget` after one
//   request, with 2 spent, never more than the 3 it had.
import { Blueprint, emits, expect } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import get from "@orthograph/agents/blueprint/things/run/verbs/get.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunFailed, RunFinished } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";
import support from "../blueprint/agents/support.ts";

export default Blueprint.journey("a spent budget fails the run", {
  cast: { ada: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step(
      "ada starts a notes run with a budget of 1 cent",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 1n, key: "tight-1" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "it fails for its budget and will not be retried",
      s.world.until(machine.isIn(s.started.run, "failed")),
      emits(RunFailed, { run: s.started.run, reason: "budget", transient: false }),
    ),
    s.step(
      "no request was sent and nothing was spent",
      s.world.requests({ run: s.started.run }),
      expect((a) => [a.sent, a.repeated]).toEqual([0, []]),
    ),
    s.step(
      "read back, it spent 0 of a budget of 1",
      s.ada.run(get, { id: s.started.run }),
      expect((a) => [a.state, a.budget, a.spent]).toEqual(["failed", 1n, 0n]),
    ),
    s.step(
      "ada starts the same run with a budget of 3 cents",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 3n, key: "loose-1" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "it pays for its one reply and finishes with 2 spent",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(RunFinished, { run: s.started.run, outcome: "answered", spent: 2n }),
    ),
    s.step(
      "ada starts a support run with 3 cents: one reply and a tool call, and no money for the next reply",
      s.ada.run(start, { agent: support, model: Models.standIn, brief: "list my allowances", budget: 3n, key: "tight-2" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "it fails for its budget after one request",
      s.world.until(machine.isIn(s.started.run, "failed")),
      emits(RunFailed, { run: s.started.run, reason: "budget", transient: false }),
    ),
    s.step(
      "read back, it spent 2 of a budget of 3",
      s.ada.run(get, { id: s.started.run }),
      expect((a) => [a.state, a.budget, a.spent]).toEqual(["failed", 3n, 2n]),
    ),
  ],
});
