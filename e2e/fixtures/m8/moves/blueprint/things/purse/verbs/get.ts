import { Blueprint } from "orthograph";
import { Purse } from "../thing.ts";

export default Blueprint.read(Purse, {
  by: "id",
  fields: ["limit", "spent", "openedAt", "period", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
