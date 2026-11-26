import { Blueprint } from "orthograph";
import { Booking } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Booking, {
  description: "Book a table now, by the world's clock. The keeper seats it an hour later, if the table is free.",
  payload: { table: Booking.fields.table },
  answer: { booking: Booking.fields.id, waitingSince: Booking.fields.waitingSince },
  move: machine.moves.book,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
