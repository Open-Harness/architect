// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// A ping lives in its own actor: its event is written in that actor's SQLite, comes home to the default journal, and is
// delivered from there (M5-reach-out, Q1.4). Delivered as the system, once, like any other event.
import { Blueprint, calledBy, emits, expect, spans } from "orthograph";
import { Pinged } from "../blueprint/things/ping/events.ts";
import { NotificationDelivered } from "../blueprint/things/notification/events.ts";
import send from "../blueprint/things/ping/verbs/send.ts";
import list from "../blueprint/things/notification/verbs/list.ts";

export default Blueprint.journey("an actor's event goes out too", {
  cast: { ada: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "ada pings an address",
      s.ada.run(send, { to: "cy@example.com" }),
      emits(Pinged, { ping: s.last.ping, to: "cy@example.com" }),
      spans({ present: ["ping.send", "ping.send.insert"] }),
    ),
    s.step(
      "the notifier delivers it, called by the system",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "Pinged", to: "op:notification.invite", state: "delivered" }]),
      emits(NotificationDelivered, { to: "cy@example.com" }),
      calledBy(Blueprint.system),
    ),
    s.step(
      "one notification, for that address",
      s.ada.run(list, {}),
      expect((a) => a.items.map((i: { to: string; state: string }) => [i.to, i.state])).toEqual([["cy@example.com", "delivered"]]),
    ),
  ],
});
