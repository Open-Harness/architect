import { Blueprint, expect, noEvents, spans } from "orthograph";
import edit from "../blueprint/things/allowance/verbs/edit.ts";
import { owner } from "../blueprint/things/organization/roles.ts";

export default Blueprint.journey("keep the limit", {
  cast: { ada: owner },
  starts: "funded",
  steps: (s) => [
    s.step(
      "ada leaves the limit unchanged",
      s.ada.run(edit, { allowance: s.world.allowance, limit: 500n }),
      expect((a) => a.limit).toBe(500n),
      noEvents(),
      spans({ present: ["allowance.edit.load"], absent: ["allowance.edit.save"] }),
    ),
  ],
});
