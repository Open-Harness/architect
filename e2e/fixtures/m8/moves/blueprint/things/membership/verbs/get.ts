import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";

export default Blueprint.read(Membership, {
  by: "id",
  fields: ["name", "startedAt", "overdueAt", "period", "renewals", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
