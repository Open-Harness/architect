import { Blueprint } from "orthograph";
import { Beacon } from "../thing.ts";

export default Blueprint.read(Beacon, {
  by: "id",
  fields: ["name", "litAt", "pings", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
