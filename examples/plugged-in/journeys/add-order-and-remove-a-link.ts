// Journey-author file. The builder of link.add, link.order and link.remove never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { LinkAlreadyRemoved } from "../blueprint/things/link/errors.ts";
import { LinkAdded, LinkRemoved } from "../blueprint/things/link/events.ts";
import { machine } from "../blueprint/things/link/machine.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import order from "../blueprint/things/link/verbs/order.ts";
import remove from "../blueprint/things/link/verbs/remove.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

const titles = (page: { links: ReadonlyArray<{ title: string }> }) => page.links.map((l) => l.title);

// A step reads the page, and the next one acts on a link's id from that read (`s.last` in a payload is the step before).
export default Blueprint.journey("add, order and remove a link", {
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "page-to-edit",
  steps: (s) => [
    s.step(
      "the page starts with the three links aaron put on it, in order",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["GitHub", "Blog", "Talks"]),
      expect((a) => a.links[2].id).toBe(s.world.lastLink),
      noEvents(),
    ),
    s.step(
      "aaron adds a fourth link",
      s.aaron.run(add, { title: "Newsletter", url: "https://aaron.example.com/news" }),
      expect((a) => a.link).toMatch(/^lnk_[0-9a-z]+$/),
      emits(LinkAdded, { link: s.last.link }),
      machine.isIn(s.last.link, "listed"),
      spans({ present: ["link.add", "link.add.load", "link.add.record", "link.add.commit"] }),
    ),
    s.step(
      "it goes at the end, with its title and address",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["GitHub", "Blog", "Talks", "Newsletter"]),
      expect((a) => [a.links[3].title, a.links[3].url]).toEqual(["Newsletter", "https://aaron.example.com/news"]),
      noEvents(),
    ),
    s.step(
      "aaron moves the newsletter to the top",
      s.aaron.run(order, { link: s.last.links[3].id, position: 0n }),
      noEvents(),
      spans({ present: ["link.order", "link.order.load", "link.order.record"] }),
    ),
    s.step(
      "the page shows the new order",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["Newsletter", "GitHub", "Blog", "Talks"]),
      noEvents(),
    ),
    s.step(
      "a position past the end puts a link last",
      s.aaron.run(order, { link: s.last.links[1].id, position: 99n }),
      noEvents(),
    ),
    s.step(
      "the page shows GitHub last",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["Newsletter", "Blog", "Talks", "GitHub"]),
      noEvents(),
    ),
    s.step(
      "aaron removes the talks link",
      s.aaron.run(remove, { link: s.world.lastLink }),
      emits(LinkRemoved, { link: s.world.lastLink }),
      machine.isIn(s.world.lastLink, "removed"),
      spans({ present: ["link.remove", "link.remove.record", "link.remove.commit"] }),
    ),
    s.step(
      "the page no longer lists it, and keeps the order of the rest",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["Newsletter", "Blog", "GitHub"]),
      noEvents(),
    ),
    s.step(
      "he cannot remove it twice",
      s.aaron.run(remove, { link: s.world.lastLink }),
      refuses(machine.notFrom, { state: "removed" }),
      noEvents(),
      spans({ absent: ["link.remove.record"] }),
      machine.isIn(s.world.lastLink, "removed"),
    ),
    s.step(
      "he cannot move a removed link",
      s.aaron.run(order, { link: s.world.lastLink, position: 0n }),
      refuses(LinkAlreadyRemoved),
      noEvents(),
      spans({ present: ["link.order.load"], absent: ["link.order.record"] }),
    ),
    s.step(
      "the page is as the removal left it",
      s.visitor.run(get, { handle: "editpage" }),
      expect(titles).toEqual(["Newsletter", "Blog", "GitHub"]),
      noEvents(),
    ),
  ],
});
