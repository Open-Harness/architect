import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/queued.ts";
import { Assignment } from "../../blueprint/things/assignment/thing.ts";

/** Queue an Assignment for a ticket's executor: pending, with no seat yet (a seat is given when it starts). The unique rule refuses a second live one for the executor. */
const queued: Handler<typeof declaration, Records> = (payload, { id, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const assignment = id as NonNullable<typeof id>;
    yield* records.insert(Assignment, { id: assignment, ...payload, seat: 0n });
    yield* move();
    return { assignment };
  });

export default queued;
