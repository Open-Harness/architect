import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/expire.ts";

/** Give up on a delivered eval: it is unavailable, and its triggers wait for another (the machine refuses any other state). */
const expire: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default expire;
