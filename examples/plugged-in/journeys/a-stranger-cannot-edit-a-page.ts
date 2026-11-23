// Journey-author file. The builders of link.order, link.remove and handle.release never edit it (AGENTS.md, "Journeys and checks come first").
// Waits on M2 for its meaning: until sign-in lands, bob and the visitor are the world's fixed test people (Identity.testPrincipals).
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { machine as handle } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import release from "../blueprint/things/handle/verbs/release.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { LinkNeedsHandle } from "../blueprint/things/link/errors.ts";
import { machine as link } from "../blueprint/things/link/machine.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import order from "../blueprint/things/link/verbs/order.ts";
import remove from "../blueprint/things/link/verbs/remove.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("a stranger cannot edit a page", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "page-to-guard",
  steps: (s) => [
    s.step(
      "bob has no page, so he has nowhere to add a link",
      s.bob.run(add, { title: "Spam", url: "https://bob.example.com" }),
      refuses(LinkNeedsHandle),
      noEvents(),
      spans({ absent: ["link.add.record"] }),
    ),
    s.step(
      "bob cannot move aaron's link, and the handler never runs",
      s.bob.run(order, { link: s.world.lastLink, position: 0n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["link.order"] }),
    ),
    s.step(
      "bob cannot remove aaron's link",
      s.bob.run(remove, { link: s.world.lastLink }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["link.remove"] }),
      link.isIn(s.world.lastLink, "listed"),
    ),
    s.step(
      "someone who is not signed in cannot remove it either",
      s.visitor.run(remove, { link: s.world.lastLink }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["link.remove"] }),
    ),
    s.step(
      "someone who is not signed in cannot claim a name",
      s.visitor.run(claim, { name: "visitorpage" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["handle.claim"] }),
    ),
    s.step(
      "aaron's name resolves, for anyone",
      s.visitor.run(resolve, { name: "guardpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      noEvents(),
    ),
    s.step(
      "bob cannot release aaron's name",
      s.bob.run(release, { handle: s.last.handle }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["handle.release"] }),
      handle.isIn(s.last.handle, "claimed"),
    ),
    s.step(
      "aaron's page is exactly as he left it",
      s.visitor.run(get, { handle: "guardpage" }),
      expect((a) => a.links.length).toBe(1),
      expect((a) => [a.links[0].id, a.links[0].title, a.links[0].url]).toEqual([s.world.lastLink, "GitHub", "https://github.com/aaron"]),
      noEvents(),
    ),
  ],
});
