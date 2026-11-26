import { Blueprint } from "orthograph";
import { Meter } from "../thing.ts";

export default Blueprint.read(Meter, {
  by: "id",
  fields: ["name", "startedAt", "jammed", "ticks", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
