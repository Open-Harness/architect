import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/retire.ts";

/** Retire a superagent for good. Closing its connections and agents follows from `SuperagentRetired`, which slices 9 and 11 deliver. */
const retire: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default retire;
