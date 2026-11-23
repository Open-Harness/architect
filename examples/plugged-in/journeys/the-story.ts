// Journey-author file. The builders never edit it (AGENTS.md, "Journeys and checks come first").
// The one-sentence story of Plugged In at stage 1, through the SDK's calls. Its other halves (the person signs up; a fresh
// folder; the CLI, MCP and HTTP) cannot be written as journeys yet: see journeys/README.md, "The story".
import { Blueprint, emits, expect, noEvents, spans } from "orthograph";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import { machine as handle } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import { LinkAdded } from "../blueprint/things/link/events.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("a person claims a page and shares it", {
  // Until M2 (sign-in), aaron is one of the world's fixed test people. The sign-up step is the story's first and cannot run yet.
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "aaron claims @aaron",
      s.aaron.run(claim, { name: "aaron" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "aaron" }),
      handle.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim", "handle.claim.record", "handle.claim.commit"] }),
    ),
    s.step(
      "aaron adds his GitHub",
      s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
      emits(LinkAdded, { link: s.last.link }),
      spans({ present: ["link.add.record", "link.add.commit"] }),
    ),
    s.step(
      "aaron adds his blog",
      s.aaron.run(add, { title: "Blog", url: "https://aaron.example.com/blog" }),
      emits(LinkAdded, { link: s.last.link }),
    ),
    s.step(
      "aaron adds his talks",
      s.aaron.run(add, { title: "Talks", url: "https://aaron.example.com/talks" }),
      emits(LinkAdded, { link: s.last.link }),
    ),
    s.step(
      "anyone sees his public page at @aaron: three links in the order he added them",
      s.visitor.run(get, { handle: "aaron" }),
      expect((a) => a.handle).toBe("aaron"),
      expect((a) => a.links.map((l: { title: string; url: string }) => [l.title, l.url])).toEqual([
        ["GitHub", "https://github.com/aaron"],
        ["Blog", "https://aaron.example.com/blog"],
        ["Talks", "https://aaron.example.com/talks"],
      ]),
      noEvents(),
      spans({ present: ["profile.get", "profile.get.load"] }),
    ),
  ],
});
