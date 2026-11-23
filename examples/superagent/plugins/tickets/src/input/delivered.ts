import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/delivered.ts";

/** The executor took the Input (the machine refuses one that was not routed). */
const delivered: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default delivered;
