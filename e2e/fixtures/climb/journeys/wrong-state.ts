// Climb check fixture: one journey for one kind of failure, on acme's allowance. A correct handler passes it.
import { Blueprint } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("climb: the wrong state", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends all of it and the allowance is exhausted",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 500n, memo: "everything" }),
      machine.isIn(s.world.allowance, "exhausted"),
    ),
  ],
});
