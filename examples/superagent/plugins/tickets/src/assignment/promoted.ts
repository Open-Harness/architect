import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/promoted.ts";
import { Assignment } from "../../blueprint/things/assignment/thing.ts";

/** A person's Input on a pending Assignment moves it up: its reason becomes a person's, unless it already is (then nothing changes). */
const promoted: Handler<typeof declaration, Records> = ({ assignment }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    if (subject?.["why"] !== "person") yield* records.update(Assignment, assignment, { why: "person" });
    yield* move();
    return {};
  });

export default promoted;
