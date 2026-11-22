// Journey-author file (M5.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// A call that is refused writes no event and no outbox row (M5-reach-out, Q1.1): nothing is delivered, now or later.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { InvitationSent } from "../blueprint/things/invitation/events.ts";
import { InvitationBlocked } from "../blueprint/things/invitation/errors.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";
import list from "../blueprint/things/notification/verbs/list.ts";

export default Blueprint.journey("a refused call sends nothing", {
  cast: { ada: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "ada invites a blocked address and is refused",
      s.ada.run(send, { email: "x@blocked.example" }),
      refuses(InvitationBlocked),
      noEvents(),
      spans({ absent: ["invitation.send.insert"] }),
    ),
    s.step(
      "there is nothing to deliver",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([]),
      noEvents(),
    ),
    s.step(
      "no notification exists",
      s.ada.run(list, {}),
      expect((a) => a.items).toEqual([]),
    ),
    s.step(
      "ada invites a good address",
      s.ada.run(send, { email: "ok@example.com" }),
      emits(InvitationSent, { email: "ok@example.com" }),
    ),
    s.step(
      "only that one is delivered",
      s.world.settles(),
      expect((a) => a.deliveries).toEqual([{ event: "InvitationSent", to: "op:notification.invite", state: "delivered" }]),
    ),
    s.step(
      "one notification, for the good address only",
      s.ada.run(list, {}),
      expect((a) => a.items.map((i: { to: string; state: string }) => [i.to, i.state])).toEqual([["ok@example.com", "delivered"]]),
    ),
  ],
});
