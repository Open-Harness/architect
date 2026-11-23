import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/approve.ts";

/** A person, through a session, approves a waiting proposal (the machine refuses any other). The change it names is then theirs to make, as that operation called by them. */
const approve: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default approve;
