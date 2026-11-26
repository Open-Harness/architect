import { Blueprint } from "orthograph";
import { Booking } from "../thing.ts";

export default Blueprint.read(Booking, {
  by: "id",
  fields: ["table", "waitingSince", "seats", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
