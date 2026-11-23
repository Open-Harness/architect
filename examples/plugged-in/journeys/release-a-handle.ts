// Journey-author file. The builder of handle.release never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleNotFound } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed, HandleReleased } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import release from "../blueprint/things/handle/verbs/release.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { LinkNeedsHandle } from "../blueprint/things/link/errors.ts";
import { LinkAdded } from "../blueprint/things/link/events.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("release a handle", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "claimed-to-release",
  steps: (s) => [
    s.step(
      "aaron puts a link on his page before he lets the name go",
      s.aaron.run(add, { title: "Old link", url: "https://aaron.example.com/old" }),
      expect((a) => a.link).toMatch(/^lnk_[0-9a-z]+$/),
    ),
    s.step(
      "bob cannot release aaron's name",
      s.bob.run(release, { handle: s.world.handle }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["handle.release"] }),
      machine.isIn(s.world.handle, "claimed"),
    ),
    s.step(
      "aaron releases his name",
      s.aaron.run(release, { handle: s.world.handle }),
      emits(HandleReleased, { handle: s.world.handle, name: "releasepage" }),
      machine.isIn(s.world.handle, "released"),
      spans({ present: ["handle.release", "handle.release.record", "handle.release.commit"] }),
    ),
    s.step(
      "he cannot release it twice",
      s.aaron.run(release, { handle: s.world.handle }),
      refuses(machine.notFrom, { state: "released" }),
      noEvents(),
      spans({ absent: ["handle.release.record"] }),
      machine.isIn(s.world.handle, "released"),
    ),
    s.step(
      "the released name no longer resolves",
      s.visitor.run(resolve, { name: "releasepage" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
    s.step(
      "the released name has no public page",
      s.visitor.run(get, { handle: "releasepage" }),
      refuses(ProfileNotFound),
      noEvents(),
    ),
    s.step(
      "aaron has no page to add a link to any more",
      s.aaron.run(add, { title: "Too late", url: "https://aaron.example.com/late" }),
      refuses(LinkNeedsHandle),
      noEvents(),
      spans({ absent: ["link.add.record"] }),
    ),
    s.step(
      "someone else claims the released name",
      s.bob.run(claim, { name: "releasepage" }),
      emits(HandleClaimed, { handle: s.last.handle, name: "releasepage" }),
      machine.isIn(s.last.handle, "claimed"),
      machine.isIn(s.world.handle, "released"),
    ),
    s.step(
      "the new page has none of the old owner's links",
      s.visitor.run(get, { handle: "releasepage" }),
      expect((a) => a).toEqual({ handle: "releasepage", links: [] }),
      noEvents(),
    ),
    s.step(
      "the old handle is not bob's: he cannot release it, and it stays released",
      s.bob.run(release, { handle: s.world.handle }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.handle, "released"),
    ),
    s.step(
      "aaron can claim again: a released handle does not count as one he holds",
      s.aaron.run(claim, { name: "aaronspage" }),
      emits(HandleClaimed, { handle: s.last.handle, name: "aaronspage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim.record", "handle.claim.commit"] }),
    ),
    s.step(
      "aaron can add a link again, to his new page",
      s.aaron.run(add, { title: "New link", url: "https://aaron.example.com/new" }),
      expect((a) => a.link).toMatch(/^lnk_[0-9a-z]+$/),
      emits(LinkAdded, { link: s.last.link }),
    ),
    s.step(
      "his new page has only the new link, and the old name's page is still bob's and empty",
      s.visitor.run(get, { handle: "aaronspage" }),
      expect((a) => a.links.map((l: { title: string }) => l.title)).toEqual(["New link"]),
      noEvents(),
    ),
  ],
});
