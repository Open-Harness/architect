import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/reject.ts";

/** A person, through a session, turns a waiting proposal down. */
const reject: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default reject;
