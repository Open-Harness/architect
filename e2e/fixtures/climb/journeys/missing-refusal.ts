// Climb check fixture: one journey for one kind of failure, on acme's allowance. A correct handler passes it.
import { Blueprint, noEvents, refuses } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { AllowanceExceeded } from "../blueprint/things/allowance/errors.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("climb: a missing refusal", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga can't spend more than the allowance",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 600n, memo: "hotel" }),
      refuses(AllowanceExceeded, { remaining: 500n }),
      noEvents(),
    ),
  ],
});
