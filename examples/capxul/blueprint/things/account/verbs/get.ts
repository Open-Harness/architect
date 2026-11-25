import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the account's record. Its state says
// whether it is a group or a ledger.
export default Blueprint.read(Account, {
  by: "id",
  fields: ["company", "accountName", "parentAccount", "rootType", "reportType", "accountType", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
