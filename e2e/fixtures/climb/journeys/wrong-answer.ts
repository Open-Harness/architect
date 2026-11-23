// Climb check fixture: one journey for one kind of failure, on acme's allowance. A correct handler passes it.
import { Blueprint, expect } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("climb: a wrong answer", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends some and is told what is left",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      expect((a) => a.remaining).toBe(380n),
    ),
  ],
});
