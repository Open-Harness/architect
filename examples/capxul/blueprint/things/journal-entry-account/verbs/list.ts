import { Blueprint } from "orthograph";
import { JournalEntryAccount } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A journal entry's lines, in the order they were written, which is the order given (ERPNext's `accounts` table). A
// read changes nothing, so it has no handler.
export default Blueprint.read(JournalEntryAccount, {
  where: ["journalEntry"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("journalEntry.company")],
  budget: { p95: "80 millis" },
});
