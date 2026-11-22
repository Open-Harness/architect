// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 3):
//   Bob starts the support agent on a brief to spend 120. While its first model request is held, he cancels the run.
//   It is cancelled, it says so, and cancelling is never a failure. When the held reply comes back the run does not act
//   on it: its tools never answer, nothing is spent from his allowance, the run stays cancelled, no second request is
//   sent and nothing more is emitted.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import cancel from "@orthograph/agents/blueprint/things/run/verbs/cancel.js";
import get from "@orthograph/agents/blueprint/things/run/verbs/get.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import getAllowance from "../blueprint/things/allowance/verbs/get.ts";
import { RunCancelled } from "@orthograph/agents/blueprint/things/run/events.js";
import support from "../blueprint/agents/support.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";

export default Blueprint.journey("cancelling stops the tools", {
  cast: { bob: grantee },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step(
      "bob starts a support run",
      s.bob.run(start, { agent: support, model: Models.standIn, brief: "spend 120 from my allowance for the train", budget: 100n, key: "cancel-1" }),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "bob cancels it: cancelled, and said so",
      s.bob.run(cancel, { run: s.started.run }),
      emits(RunCancelled, { run: s.started.run }),
      machine.isIn(s.started.run, "cancelled"),
    ),
    s.step(
      "the model answers late",
      s.world.releaseModel({ run: s.started.run }),
      expect((a) => a.held).toBe(false),
    ),
    s.step(
      "the world goes quiet, with nothing emitted and the run still cancelled",
      s.world.quiet(),
      noEvents(),
      machine.isIn(s.started.run, "cancelled"),
    ),
    s.step(
      "no tool ran",
      s.world.toolCalls({ run: s.started.run }),
      expect((a) => a.calls).toEqual([]),
    ),
    s.step(
      "one request was ever sent, and the run is still cancelled",
      s.world.requests({ run: s.started.run }),
      expect((a) => [a.sent, a.repeated]).toEqual([1, []]),
    ),
    s.step(
      "read back, it is cancelled with nothing spent",
      s.bob.run(get, { id: s.started.run }),
      expect((a) => [a.state, a.spent]).toEqual(["cancelled", 0n]),
    ),
    s.step(
      "and nothing came out of his allowance",
      s.bob.run(getAllowance, { id: s.world.allowance }),
      expect((a) => [a.spent, a.state]).toEqual([0n, "active"]),
    ),
  ],
});
