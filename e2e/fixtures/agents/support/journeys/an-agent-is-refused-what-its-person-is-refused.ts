// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 7):
//   The desk agent is offered `allowance.revoke`, which only the organisation's owner may call. Bob, who was granted
//   an allowance but owns nothing, starts a desk run. Its tool call is made as an agent for Bob and is refused
//   `NotAllowed`, exactly as Bob is when he calls it himself: the allowance stays active and nothing is emitted for
//   it. Ada, who owns the organisation, starts the same agent, and the same call, as an agent for Ada, goes through:
//   the allowance is revoked. The agent is a caller like any other: the roles decide, not the agent.
//
// What the model chooses to call is not asserted beyond this: the brief says to revoke, and the agent's tool list holds
// exactly two operations. `s.world.toolCalls` answers each call the run made, as `{ name, as, for, outcome, refusal }`.
import { Blueprint, emits, expect, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { AllowanceRevoked } from "../blueprint/things/allowance/events.ts";
import { machine as allowance } from "../blueprint/things/allowance/machine.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import revoke from "../blueprint/things/allowance/verbs/revoke.ts";
import { owner } from "../blueprint/things/organization/roles.ts";
import desk from "../blueprint/agents/desk.ts";

const calls = (a: { readonly calls: ReadonlyArray<{ readonly name: string; readonly as: string; readonly outcome: string; readonly refusal?: string }> }) =>
  a.calls.map((c) => `${c.name} ${c.as} ${c.outcome}${c.refusal ? ` ${c.refusal}` : ""}`);

export default Blueprint.journey("an agent is refused what its person is refused", {
  cast: { ada: owner, bob: grantee },
  starts: "bob-funded",
  steps: (s) => [
    s.step(
      "bob starts a desk run that is told to revoke his allowance",
      s.bob.run(start, { agent: desk, model: Models.standIn, brief: "revoke my allowance", budget: 100n, key: "desk-bob" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "it was offered the two operations the desk lists",
      s.world.tools({ run: s.started.run }),
      expect((a) => a.offered).toEqual(["allowance.mine", "allowance.revoke"]),
    ),
    s.step(
      "the run ends",
      s.world.until(machine.isIn(s.started.run, "done")),
    ),
    s.step(
      "its revoke was made as an agent for bob and refused, and the allowance is active",
      s.world.toolCalls({ run: s.started.run }),
      expect(calls).toEqual(["allowance.mine agent ok", "allowance.revoke agent refused NotAllowed"]),
      expect((a) => a.calls.map((c: { readonly for: unknown }) => c.for)).toEqual([s.bob.person, s.bob.person]),
      allowance.isIn(s.world.allowance, "active"),
    ),
    s.step(
      "bob himself is refused the same way",
      s.bob.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      allowance.isIn(s.world.allowance, "active"),
    ),
    s.step(
      "ada starts a desk run told to revoke the allowance",
      s.ada.run(start, { agent: desk, model: Models.standIn, brief: "revoke the allowance", budget: 100n, key: "desk-ada" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "it ends, and the allowance is revoked",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      allowance.isIn(s.world.allowance, "revoked"),
    ),
    s.step(
      "its revoke was made as an agent for ada and went through",
      s.world.toolCalls({ run: s.started.run }),
      expect(calls).toEqual(["allowance.mine agent ok", "allowance.revoke agent ok"]),
      expect((a) => a.calls.map((c: { readonly for: unknown }) => c.for)).toEqual([s.ada.person, s.ada.person]),
    ),
  ],
});
