import { Blueprint } from "orthograph";
import { Branch } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the branch's record.
export default Blueprint.read(Branch, {
  by: "id",
  fields: ["company", "branchName", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
