import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/go-live.ts";

/** Let a superagent act, after a person read what it would have accepted: only an observing one may go live (the machine refuses any other). */
const goLive: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default goLive;
