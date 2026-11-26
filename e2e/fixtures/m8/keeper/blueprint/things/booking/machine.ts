import { Blueprint } from "orthograph";
import { Booking } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Booking, {
  states: ["waiting", "seated"],
  moves: {
    book: { from: [], to: "waiting", emits: Events.BookingMade },
    // An hour after it was made, the keeper seats it: through the normal pipeline, so the table's rule can refuse it.
    seat: { from: ["waiting"], to: "seated", emits: Events.BookingSeated, by: Blueprint.time.after("waitingSince", "1 hour") },
  },
  notFrom: { exit: 92 },
});
