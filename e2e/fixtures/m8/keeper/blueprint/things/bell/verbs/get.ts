import { Blueprint } from "orthograph";
import { Bell } from "../thing.ts";

export default Blueprint.read(Bell, {
  by: "id",
  fields: ["name", "setAt", "chimes", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
