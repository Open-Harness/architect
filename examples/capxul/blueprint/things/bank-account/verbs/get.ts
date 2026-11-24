import { Blueprint } from "orthograph";
import { BankAccount } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read. It answers from the account's record, to the company's owner.
export default Blueprint.read(BankAccount, {
  by: "id",
  fields: ["company", "business", "accountName", "currency", "bankName", "accountNumber", "routingNumber", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
