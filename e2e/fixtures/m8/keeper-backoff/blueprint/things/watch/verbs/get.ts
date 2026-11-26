import { Blueprint } from "orthograph";
import { Watch } from "../thing.ts";

export default Blueprint.read(Watch, {
  by: "id",
  fields: ["name", "nextCheckAt", "checks", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
