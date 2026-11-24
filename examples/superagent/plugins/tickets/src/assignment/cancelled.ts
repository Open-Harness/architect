import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/cancelled.ts";

/** A pending Assignment that was never seated or told ends at once: nothing ran (the machine refuses any other state). */
const cancelled: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default cancelled;
