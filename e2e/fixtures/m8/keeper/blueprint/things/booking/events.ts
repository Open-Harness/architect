import { Blueprint } from "orthograph";
import { Booking } from "./thing.ts";
import { Instant } from "../../values/time.ts";

export const BookingMade = Blueprint.event({ booking: Booking.fields.id, waitingSince: Instant });
export const BookingSeated = Blueprint.event({ booking: Booking.fields.id, at: Instant });
