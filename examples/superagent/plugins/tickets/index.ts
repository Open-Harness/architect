import { Blueprint } from "orthograph";
import * as ticketEvents from "./blueprint/things/ticket/events.ts";
import * as assignmentEvents from "./blueprint/things/assignment/events.ts";
import * as inputEvents from "./blueprint/things/input/events.ts";
import * as messageEvents from "./blueprint/things/outgoing-message/events.ts";
import route from "./blueprint/things/input/verbs/route.ts";
import store from "./blueprint/things/input/verbs/store.ts";
import turnEnded from "./blueprint/things/assignment/verbs/turn-ended.ts";
import send from "./blueprint/things/outgoing-message/verbs/send.ts";
import withdraw from "./blueprint/things/outgoing-message/verbs/withdraw.ts";
import reply from "./blueprint/things/outgoing-message/verbs/reply.ts";
import revalidate from "./blueprint/things/mandate/verbs/revalidate.ts";
import requeue from "./blueprint/things/input/verbs/requeue.ts";
import policyChanged from "./blueprint/things/ticket/verbs/policy-changed.ts";

export default Blueprint.feature({
  description: "Mandate, Ticket, Subscription, Assignment, Input, Report, Attention and Outgoing message: the work a superagent was allowed to do, and the ticket stage read.",
});

/** What an app wires: this plugin's events, and the operations an outbox hop may call. */
export const events = { ...ticketEvents, ...assignmentEvents, ...inputEvents, ...messageEvents };
export const things = {
  ticket: { operations: { policyChanged } },
  input: { operations: { route, store, requeue } },
  assignment: { operations: { turnEnded } },
  outgoingMessage: { operations: { send, withdraw, reply } },
  mandate: { operations: { revalidate } },
};
