// Journey-author file (M4.02). The builder never edits it. Gate M4 item 1.
//
// In words:
//   Bob has an allowance of 500. He starts acme's support agent with the brief to spend 120 of it. The agent's
//   calls are made as an agent for Bob, and the server's roles let him spend: 120 comes out of his allowance, the
//   event says so, and a read of the allowance shows 120 spent. The agent also lists `invitation.accept`, which is
//   marked `.notVia(Via.agent)`: it is never offered to the run as a tool, and the server refuses it to an agent key
//   for Bob, with the invitation still pending. The journey never reads what the model said: not its memo, not its words.
import { Blueprint, Via, emits, expect, noEvents, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import getAllowance from "../blueprint/things/allowance/verbs/get.ts";
import accept from "../blueprint/things/invitation/verbs/accept.ts";
import { machine as invitation } from "../blueprint/things/invitation/machine.ts";
import support from "../blueprint/agents/support.ts";

export default Blueprint.journey("the support agent spends for bob", {
  cast: { bob: grantee },
  starts: "bob-funded",
  steps: (s) => [
    s.step(
      "bob starts the support agent with a brief to spend 120",
      s.bob.run(start, { agent: support, model: Models.standIn, brief: "spend 120 from my allowance for the train", budget: 100n, key: "spend-1" }),
      expect((a) => typeof a.run).toBe("string"),
    ),
    s.step(
      "the run was offered the allowance tools and not invitation.accept",
      s.world.tools({ run: s.started.run }),
      expect((a) => a.offered).toEqual(["allowance.get", "allowance.mine", "allowance.spend"]),
    ),
    s.step(
      "it ends, and 120 came out of bob's allowance",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 120n, remaining: 380n }),
    ),
    s.step(
      "every call it made was as an agent for bob, and none was refused",
      s.world.toolCalls({ run: s.started.run }),
      expect((a) => a.calls.map((c: { readonly name: string; readonly as: string; readonly outcome: string }) => `${c.name} ${c.as} ${c.outcome}`)).toEqual(["allowance.mine agent ok", "allowance.spend agent ok"]),
      expect((a) => a.calls.map((c: { readonly for: unknown }) => c.for)).toEqual([s.bob.person, s.bob.person]),
    ),
    s.step(
      "read back, 120 is spent",
      s.bob.run(getAllowance, { id: s.world.allowance }),
      expect((a) => [a.limit, a.spent, a.state]).toEqual([500n, 120n, "active"]),
    ),
    s.step(
      "an agent key for bob is refused invitation.accept, and the invitation stays pending",
      s.bob.via(Via.agent).run(accept, { invitation: s.world.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      invitation.isIn(s.world.invitation, "pending"),
    ),
    s.step(
      "the same agent key reads bob's allowance: it is refused only what is marked, not everything",
      s.bob.via(Via.agent).run(getAllowance, { id: s.world.allowance }),
      expect((a) => [a.limit, a.spent, a.state]).toEqual([500n, 120n, "active"]),
    ),
  ],
});
