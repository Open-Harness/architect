import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A bank account's transactions, oldest first (ERPNext's Bank Transaction list, filtered by bank account). It is how a
// journey sees that a deposit reported twice is recorded once, and a retried transfer made once.
export default Blueprint.read(BankTransaction, {
  where: ["account"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("account.company")],
  budget: { p95: "80 millis" },
});
