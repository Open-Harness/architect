import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/interrupted.ts";

/** A running Assignment is closing: it keeps its seat until the Agent says its turn closed (the machine refuses any other state). */
const interrupted: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default interrupted;
