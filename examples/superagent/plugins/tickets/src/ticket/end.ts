import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/end.ts";

/** End an open ticket (the machine refuses any other state): its executor stays, idle. */
const end: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default end;
