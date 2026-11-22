import { Blueprint } from "orthograph";
import { Notification } from "../thing.ts";
import { machine } from "../machine.ts";
import { InvitationSent } from "../../invitation/events.ts";
import { Pinged } from "../../ping/events.ts";

// Our own events, delivered by the system and by nobody else (M5-reach-out, Q3 and Q4). `meta.id` is the event's id:
// the notification keeps it as `cause`, so one event is one notification.
export default Blueprint.operation(Notification, {
  description: "Tell someone an event happened to them. Delivered by the outbox, never called by a person.",
  payload: { to: Notification.fields.to, cause: Notification.fields.cause },
  answer: { notification: Notification.fields.id },
  move: machine.moves.deliver,
  errors: [],
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(InvitationSent, (e, meta) => ({ to: e.email, cause: meta.id })),
    Blueprint.on(Pinged, (e, meta) => ({ to: e.to, cause: meta.id })),
  ],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "400 millis" },
});
