// Climb check fixture: one journey for one kind of failure, on acme's allowance. A correct handler passes it.
import { Blueprint, emits } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("climb: a missing event", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends some and the spend is announced",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 120n, memo: "train", remaining: 380n }),
    ),
  ],
});
