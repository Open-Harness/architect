import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/open.ts";

/**
 * Make an agent of one kind, about one thing: the runtime stores it, in its own actor, from the payload and the id it minted, and
 * it is idle. Only this thin record is made here: the agent's turns on Pi Durable are slice 9's (`agent.tell`, `agent.close`).
 */
const open: Handler<typeof declaration> = (_payload, { id, move }) => Effect.as(move(), { agent: id as NonNullable<typeof id> });

export default open;
