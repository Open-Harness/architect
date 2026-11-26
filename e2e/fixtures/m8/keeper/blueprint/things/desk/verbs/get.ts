import { Blueprint } from "orthograph";
import { Desk } from "../thing.ts";

export default Blueprint.read(Desk, {
  by: "id",
  fields: ["name", "heldAt", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
