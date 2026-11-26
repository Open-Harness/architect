import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read. It answers from the transaction's record, to the company's owner.
export default Blueprint.read(BankTransaction, {
  by: "id",
  fields: ["company", "account", "date", "deposit", "withdrawal", "currency", "reference", "party", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
