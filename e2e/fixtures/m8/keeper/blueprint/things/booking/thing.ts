import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Booking = Blueprint.thing({
  description: "A booking for a table: it waits, and the keeper seats it an hour after it was made, unless another booking already holds the table.",
  fields: { id: Blueprint.id("bkg"), table: Title, waitingSince: Instant, seats: Count },
});
