// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 5, first half; M4-agents call 3):
//   Bob starts the support agent on a brief that takes exactly one tool call, then an answer: two model requests.
//   The world evicts the run's host in the tool phase: the model's first reply has committed and its tool call has
//   not. The run resumes under the same id and finishes, and the stand-in saw exactly two requests, none of them
//   twice: the committed reply was never asked for again. Usage carries on (2 replies, 4 cents), it does not start over.
//
// `s.world.holdTool()` holds the next tool call of any run, once, so the eviction can land between the model step's
// commit and the tool's (README). The span step needs M4.08 (telemetry), which comes before M4.10 in the goal.
import { Blueprint, emits, expect, spans } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunFinished, RunStarted } from "@orthograph/agents/blueprint/things/run/events.js";
import support from "../blueprint/agents/support.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";

export default Blueprint.journey("eviction in the tool phase makes no extra request", {
  cast: { bob: grantee },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the next tool call is held", s.world.holdTool(), expect((a) => a.heldTool).toBe(true)),
    s.step(
      "bob starts a support run that reads his allowances once",
      s.bob.run(start, { agent: support, model: Models.standIn, brief: "list my allowances", budget: 100n, key: "tool-1" }),
      emits(RunStarted, { run: s.started.run }),
    ),
    s.step(
      "the world evicts the run's host after its first reply committed and before its tool did",
      s.world.evict({ run: s.started.run, during: "tool" }),
      expect((a) => [a.during, a.turnsCommitted]).toEqual(["tool", 1]),
    ),
    s.step(
      "it resumes under the same id and finishes",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(RunFinished, { run: s.started.run, outcome: "answered", spent: 4n }),
    ),
    s.step(
      "the stand-in saw two requests and none twice",
      s.world.requests({ run: s.started.run }),
      expect((a) => [a.sent, a.repeated]).toEqual([2, []]),
    ),
    s.step(
      "usage carries on: two replies, 4 cents",
      s.world.usage({ run: s.started.run }),
      expect((a) => [a.turns, a.spent]).toEqual([2, 4n]),
    ),
    s.step(
      "the tool ran once, as an agent for bob, and was not run again",
      s.world.toolCalls({ run: s.started.run }),
      expect((a) => a.calls.map((c: { readonly name: string; readonly as: string; readonly outcome: string }) => `${c.name} ${c.as} ${c.outcome}`)).toEqual(["allowance.mine agent ok"]),
    ),
    s.step(
      "the run lived in two hosts: the one evicted and the one that resumed it",
      s.world.hosts({ run: s.started.run }),
      expect((a) => a.started).toBe(2),
    ),
    s.step(
      "one trace holds the run and its turns",
      s.world.trace({ run: s.started.run }),
      spans({ present: ["agent.run", "agent.turn", "agent.tool.allowance.mine"] }),
      expect((a) => a.traces).toBe(1),
    ),
  ],
});
