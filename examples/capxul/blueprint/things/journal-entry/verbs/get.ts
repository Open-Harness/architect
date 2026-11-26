import { Blueprint } from "orthograph";
import { JournalEntry } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the entry's record. Its lines are
// `journal-entry-account.list`.
export default Blueprint.read(JournalEntry, {
  by: "id",
  fields: ["company", "postingDate", "userRemark", "totalDebit", "totalCredit", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
