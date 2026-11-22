import { Blueprint } from "orthograph";
import { Payment } from "../thing.ts";

export default Blueprint.read(Payment, {
  by: "id",
  fields: ["amount", "intent", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
