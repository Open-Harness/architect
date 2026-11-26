import { Blueprint } from "orthograph";
import { PaymentEntry } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the payment's record.
export default Blueprint.read(PaymentEntry, {
  by: "id",
  fields: ["company", "paymentType", "postingDate", "partyType", "party", "paidFrom", "paidTo", "paidAmount", "costCenter", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
