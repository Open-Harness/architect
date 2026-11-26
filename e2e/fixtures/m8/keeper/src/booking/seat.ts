// Scaffolded from blueprint/things/booking/verbs/seat.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/booking/seat.handler.ts";
import { Booking } from "../../blueprint/things/booking/thing.ts";

/** Seat the booking: one more seating, counted. The table's rule is the runtime's, not this handler's (G5 section 4). */
const seat: Handler = ({ booking }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Booking, booking));
    if (!found) return yield* Effect.die(new Error(`booking ${booking} was checked and then not found`));
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Booking, booking, { seats: (found["seats"] as bigint) + 1n }));
    yield* move("seated");
    return { at };
  });

export default seat;
