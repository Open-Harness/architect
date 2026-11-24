import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/propose.ts";

/** Record what the main agent would change, and why: made `waiting`, from the payload, and nothing changes until a person approves it. */
const propose: Handler<typeof declaration> = (_payload, { id, move }) => Effect.as(move(), { proposal: id as NonNullable<typeof id> });

export default propose;
