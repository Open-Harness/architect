import { Blueprint } from "orthograph";
import { GLEntry } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// An account's ledger lines, oldest first (ERPNext's General Ledger report, filtered by account), narrowed by voucher
// when given. Cancelled lines and their reversals are listed too. A read changes nothing, so it has no handler.
export default Blueprint.read(GLEntry, {
  where: ["account", "voucherId"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("account.company")],
  budget: { p95: "80 millis" },
});
