import { Blueprint } from "orthograph";
import * as agentEvents from "./blueprint/things/agent/events.ts";
import open from "./blueprint/things/agent/verbs/open.ts";
import tell from "./blueprint/things/agent/verbs/tell.ts";
import close from "./blueprint/things/agent/verbs/close.ts";

export default Blueprint.feature({
  description: "An agent is its own thing, living in its own actor, told through the outbox and acting as itself (K40 fix 3).",
});

/** What an app wires: the agents' events, and the operations a hop may call. */
export const events = { ...agentEvents };
export const things = { agent: { operations: { open, tell, close } } };
