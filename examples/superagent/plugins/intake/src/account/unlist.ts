import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/unlist.ts";

/** Stop letting an account ask: a person it was listed for is filtered like a stranger from the next event. */
const unlist: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default unlist;
