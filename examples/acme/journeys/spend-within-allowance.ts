// Journey-author file. The builder of allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import { AllowanceExceeded } from "../blueprint/things/allowance/errors.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("spend within an allowance", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends some",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      expect((a) => a.remaining).toBe(380n),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 120n, memo: "train", remaining: 380n }),
      machine.isIn(s.world.allowance, "active"),
      spans({ present: ["allowance.spend", "allowance.spend.load", "allowance.spend.record", "allowance.spend.commit"] }),
    ),
    s.step(
      "olga can't spend more than is left",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 400n, memo: "hotel" }),
      refuses(AllowanceExceeded, { remaining: 380n }),
      noEvents(),
      spans({ present: ["allowance.spend", "allowance.spend.load"], absent: ["allowance.spend.record"] }),
    ),
    s.step(
      "olga spends the rest",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 380n, memo: "hotel" }),
      expect((a) => a.remaining).toBe(0n),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 380n, remaining: 0n }),
      machine.isIn(s.world.allowance, "exhausted"),
    ),
    s.step(
      "nothing is left this month",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, memo: "coffee" }),
      refuses(machine.notFrom, { state: "exhausted" }),
      noEvents(),
      machine.isIn(s.world.allowance, "exhausted"),
      spans({ absent: ["allowance.spend.record"] }),
    ),
  ],
});
