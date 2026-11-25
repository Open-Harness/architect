import { Blueprint } from "orthograph";
import { Kra } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the KRA's record.
export default Blueprint.read(Kra, {
  by: "id",
  fields: ["company", "title", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
