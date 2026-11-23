import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/list.ts";

/** Let an account ask: the machine refuses one already listed, and its person's words may start work from the next event. */
const list: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default list;
