import { Blueprint } from "orthograph";
import { Booking } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, an hour after the booking was made.
export default Blueprint.operation(Booking, {
  description: "Seat a waiting booking at its table.",
  payload: { booking: Booking.fields.id },
  answer: { at: Booking.fields.waitingSince },
  move: machine.moves.seat,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
