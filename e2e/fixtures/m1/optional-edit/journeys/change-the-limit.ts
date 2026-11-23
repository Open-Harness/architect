import { Blueprint, expect, spans } from "orthograph";
import edit from "../blueprint/things/allowance/verbs/edit.ts";
import { owner } from "../blueprint/things/organization/roles.ts";

export default Blueprint.journey("change the limit", {
  cast: { ada: owner },
  starts: "funded",
  steps: (s) => [
    s.step(
      "ada changes the limit",
      s.ada.run(edit, { allowance: s.world.allowance, limit: 600n }),
      expect((a) => a.limit).toBe(600n),
      spans({ present: ["allowance.edit.load", "allowance.edit.save"] }),
    ),
  ],
});
