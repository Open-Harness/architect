import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/started.ts";
import { Assignment } from "../../blueprint/things/assignment/thing.ts";
import { Input } from "../../blueprint/things/input/thing.ts";

/**
 * Give a pending Assignment a seat: it runs, and answers the words of the Input that woke it, which the Agent is told first. The seat is one
 * of the pool `superagent.fill` chose; the unique rule on a held seat refuses a second holder, and the call runs again to take the next.
 */
const started: Handler<typeof declaration, Records> = ({ assignment, seat }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const input = yield* records.find(Input, String(subject?.["input"]));
    yield* records.update(Assignment, assignment, { seat });
    yield* move();
    return { text: String(input?.["text"] ?? "") };
  });

export default started;
