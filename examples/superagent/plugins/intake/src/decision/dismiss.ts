import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/decision/verbs/dismiss.ts";

/** Set aside a recorded decision a person disagrees with (the machine refuses one that is not recorded). */
const dismiss: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default dismiss;
