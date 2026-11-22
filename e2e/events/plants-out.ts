// The planted journeys of check 02, as plants-in.ts is for check 01: each case copies one journey of
// `e2e/fixtures/events/out` with ONE wrong expectation, and prove must fail that copy at exactly that step.
import type { Plan } from "./plants-in.ts";

const DONE = '{ event: "InvitationSent", to: "op:notification.invite", state: "delivered" }';

export const ONCE: Plan = {
  file: "an-invitation-goes-out-once",
  name: "an invitation goes out once, as the system",
  steps: 6,
  cases: [
    { tag: "sent-email", step: "ada sends an invitation", swaps: [['email: "bo@example.com" }),\n      spans', 'email: "bo@example.org" }),\n      spans']] },
    { tag: "sent-span", step: "ada sends an invitation", swaps: [['present: ["invitation.send", "invitation.send.insert"]', 'present: ["invitation.send", "invitation.send.insert", "invitation.send.deliver"]']] },
    { tag: "deliveries-state", step: "the notifier delivers it, called by the system", swaps: [['state: "delivered" }]),\n      emits(NotificationDelivered', 'state: "refused" }]),\n      emits(NotificationDelivered']] },
    { tag: "deliveries-to", step: "the notifier delivers it, called by the system", swaps: [['to: "op:notification.invite", state: "delivered" }]),\n      emits(NotificationDelivered', 'to: "op:notification.other", state: "delivered" }]),\n      emits(NotificationDelivered']] },
    { tag: "deliveries-event", step: "the notifier delivers it, called by the system", swaps: [['event: "InvitationSent", to: "op:notification.invite", state: "delivered" }]),\n      emits(NotificationDelivered', 'event: "Pinged", to: "op:notification.invite", state: "delivered" }]),\n      emits(NotificationDelivered']] },
    { tag: "deliveries-twice", step: "the notifier delivers it, called by the system", swaps: [[`${DONE}]),\n      emits(NotificationDelivered`, `${DONE}, ${DONE}]),\n      emits(NotificationDelivered`]] },
    { tag: "delivered-to", step: "the notifier delivers it, called by the system", swaps: [['emits(NotificationDelivered, { to: "bo@example.com" })', 'emits(NotificationDelivered, { to: "bo@example.org" })']] },
    { tag: "called-by-signed-in", step: "the notifier delivers it, called by the system", swaps: [["calledBy(Blueprint.system)", "calledBy(Blueprint.signedIn)"]] },
    { tag: "list-pending", step: "one notification, for that address, made by that event", swaps: [['[["bo@example.com", "delivered"]]),\n      expect((a) => a.items[0].cause)', '[["bo@example.com", "pending"]]),\n      expect((a) => a.items[0].cause)']] },
    { tag: "list-two", step: "one notification, for that address, made by that event", swaps: [['[["bo@example.com", "delivered"]]),\n      expect((a) => a.items[0].cause)', '[["bo@example.com", "delivered"], ["bo@example.com", "delivered"]]),\n      expect((a) => a.items[0].cause)']] },
    { tag: "list-cause", step: "one notification, for that address, made by that event", swaps: [["toMatch(/^evt_/)", "toMatch(/^inv_/)"]] },
    { tag: "redelivered-twice", step: "redelivering the event sets its delivery back to pending", swaps: [["toEqual({ redelivered: 1 })", "toEqual({ redelivered: 2 })"]] },
    { tag: "again-failed", step: "it is delivered again and changes nothing: the first answer is kept", swaps: [['state: "delivered" }]),\n      noEvents(),\n    ),\n    s.step(\n      "still one', 'state: "failed" }]),\n      noEvents(),\n    ),\n    s.step(\n      "still one']] },
    { tag: "again-emits", step: "it is delivered again and changes nothing: the first answer is kept", swaps: [['noEvents(),\n    ),\n    s.step(\n      "still one', 'emits(NotificationDelivered, { to: "bo@example.com" }),\n    ),\n    s.step(\n      "still one']] },
    { tag: "still-two", step: "still one notification", swaps: [['[["bo@example.com", "delivered"]]),\n    ),\n  ],', '[["bo@example.com", "delivered"], ["bo@example.com", "delivered"]]),\n    ),\n  ],']] },
  ],
};

export const REFUSED: Plan = {
  file: "a-refused-call-sends-nothing",
  name: "a refused call sends nothing",
  steps: 6,
  cases: [
    { tag: "refused-tag", step: "ada invites a blocked address and is refused", swaps: [["refuses(InvitationBlocked),", "refuses(Blueprint.NotAllowed),"]] },
    { tag: "refused-emits", step: "ada invites a blocked address and is refused", swaps: [['noEvents(),\n      spans({ absent: ["invitation.send.insert"] })', 'emits(InvitationSent, { email: "x@blocked.example" }),\n      spans({ absent: ["invitation.send.insert"] })']] },
    { tag: "refused-span", step: "ada invites a blocked address and is refused", swaps: [['absent: ["invitation.send.insert"]', 'present: ["invitation.send.insert"]']] },
    { tag: "nothing-deliveries", step: "there is nothing to deliver", swaps: [['toEqual([]),\n      noEvents(),', `toEqual([${DONE}]),\n      noEvents(),`]] },
    { tag: "nothing-emits", step: "there is nothing to deliver", swaps: [['noEvents(),\n    ),\n    s.step(\n      "no notification exists"', 'emits(InvitationSent, { email: "x@blocked.example" }),\n    ),\n    s.step(\n      "no notification exists"']] },
    { tag: "no-notification", step: "no notification exists", swaps: [['toEqual([]),\n    ),\n    s.step(\n      "ada invites a good', 'toEqual([{ to: "x@blocked.example", state: "delivered" }]),\n    ),\n    s.step(\n      "ada invites a good']] },
    { tag: "good-email", step: "ada invites a good address", swaps: [['emits(InvitationSent, { email: "ok@example.com" })', 'emits(InvitationSent, { email: "ok@example.org" })']] },
    { tag: "only-two", step: "only that one is delivered", swaps: [[`${DONE}]),\n    ),`, `${DONE}, ${DONE}]),\n    ),`]] },
    { tag: "only-refused", step: "only that one is delivered", swaps: [['state: "delivered" }]),\n    ),\n    s.step(\n      "one notification, for the good', 'state: "refused" }]),\n    ),\n    s.step(\n      "one notification, for the good']] },
    { tag: "final-list", step: "one notification, for the good address only", swaps: [['[["ok@example.com", "delivered"]]', '[["x@blocked.example", "delivered"], ["ok@example.com", "delivered"]]']] },
  ],
};

export const ACTOR: Plan = {
  file: "an-actors-event-goes-out-too",
  name: "an actor's event goes out too",
  steps: 3,
  cases: [
    { tag: "ping-to", step: "ada pings an address", swaps: [['to: "cy@example.com" }),\n      spans', 'to: "cy@example.org" }),\n      spans']] },
    { tag: "ping-span", step: "ada pings an address", swaps: [['present: ["ping.send", "ping.send.insert"]', 'present: ["ping.send", "ping.send.insert", "ping.send.nothing"]']] },
    { tag: "ping-event", step: "the notifier delivers it, called by the system", swaps: [['event: "Pinged"', 'event: "InvitationSent"']] },
    { tag: "ping-state", step: "the notifier delivers it, called by the system", swaps: [['state: "delivered" }]),\n      emits(NotificationDelivered', 'state: "pending" }]),\n      emits(NotificationDelivered']] },
    { tag: "ping-delivered-to", step: "the notifier delivers it, called by the system", swaps: [['emits(NotificationDelivered, { to: "cy@example.com" })', 'emits(NotificationDelivered, { to: "cy@example.org" })']] },
    { tag: "ping-called-by", step: "the notifier delivers it, called by the system", swaps: [["calledBy(Blueprint.system)", "calledBy(Blueprint.signedIn)"]] },
    { tag: "ping-list", step: "one notification, for that address", swaps: [['[["cy@example.com", "delivered"]]', '[["cy@example.com", "pending"]]']] },
  ],
};

export const PLANS: ReadonlyArray<Plan> = [ONCE, REFUSED, ACTOR];
