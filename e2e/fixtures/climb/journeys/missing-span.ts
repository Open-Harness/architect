// Climb check fixture: one journey for one kind of failure, on acme's allowance. A correct handler passes it.
import { Blueprint, spans } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("climb: a missing span", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends some and the record step is traced",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      spans({ present: ["allowance.spend", "allowance.spend.record"] }),
    ),
  ],
});
