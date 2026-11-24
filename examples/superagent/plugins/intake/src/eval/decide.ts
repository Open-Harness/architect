import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/decide.ts";

/** The main agent has judged the eval: it is decided, and the triggers it held are covered for good (the machine refuses any state but delivered). */
const decide: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default decide;
