// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.world.settles()` waits until every outbox of the world is empty and answers `{ deliveries: [{ event, to, state }] }`;
// `s.world.redeliver(event)` sets the last such event's delivered rows back to pending and answers `{ redelivered: n }`
// (design/decisions/M5-checks.md). The world's sender is none here: the handler only records the delivery.
import { Blueprint, calledBy, emits, expect, noEvents, spans } from "orthograph";
import { InvitationSent } from "../blueprint/things/invitation/events.ts";
import { NotificationDelivered } from "../blueprint/things/notification/events.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";
import list from "../blueprint/things/notification/verbs/list.ts";

export default Blueprint.journey("an invitation goes out once, as the system", {
  cast: { ada: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "ada sends an invitation",
      s.ada.run(send, { email: "bo@example.com" }),
      emits(InvitationSent, { invitation: s.last.invitation, email: "bo@example.com" }),
      spans({ present: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "the notifier delivers it, called by the system",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "InvitationSent", to: "op:notification.invite", state: "delivered" }]),
      emits(NotificationDelivered, { to: "bo@example.com" }),
      calledBy(Blueprint.system),
    ),
    s.step(
      "one notification, for that address, made by that event",
      s.ada.run(list, {}),
      expect((a) => a.items.map((i: { to: string; state: string }) => [i.to, i.state])).toEqual([["bo@example.com", "delivered"]]),
      expect((a) => a.items[0].cause).toMatch(/^evt_/),
    ),
    s.step(
      "redelivering the event sets its delivery back to pending",
      s.world.redeliver(InvitationSent),
      expect((a) => a).toEqual({ redelivered: 1 }),
    ),
    s.step(
      "it is delivered again and changes nothing: the first answer is kept",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "InvitationSent", to: "op:notification.invite", state: "delivered" }]),
      noEvents(),
    ),
    s.step(
      "still one notification",
      s.ada.run(list, {}),
      expect((a) => a.items.map((i: { to: string; state: string }) => [i.to, i.state])).toEqual([["bo@example.com", "delivered"]]),
    ),
  ],
});
