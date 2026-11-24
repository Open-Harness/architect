import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/turn-ended.ts";

/** The Agent idled or closed on this Assignment: it ends, and its seat is free (it leaves the states the held-seat rule covers). */
const turnEnded: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default turnEnded;
