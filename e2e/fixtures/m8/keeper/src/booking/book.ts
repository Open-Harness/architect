// Scaffolded from blueprint/things/booking/verbs/book.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/booking/book.handler.ts";
import { Booking } from "../../blueprint/things/booking/thing.ts";

/** Book the table now, by the world's clock. */
const book: Handler = ({ table }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const waitingSince = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const booking = yield* Ids.of(Booking.fields.id);
    yield* steps.insert(records.insert(Booking, { id: booking, table, waitingSince, seats: 0n }));
    yield* move("waiting");
    return { booking, waitingSince };
  });

export default book;
