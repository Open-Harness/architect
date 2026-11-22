import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";

export default Blueprint.read(Budget, {
  by: "id",
  fields: ["title", "openedAt", "resets", "reports", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
