// Journey-author file. The builder of handle.claim never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleAlreadyOwned, HandleNotFound } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { LinkNeedsHandle } from "../blueprint/things/link/errors.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

// Sign-in is M2's: until then a `signedIn` cast member is one of the world's fixed test people (Identity.testPrincipals).
export default Blueprint.journey("claim a handle", {
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "a name nobody has claimed does not resolve",
      s.visitor.run(resolve, { name: "firstpage" }),
      refuses(HandleNotFound),
      noEvents(),
      spans({ present: ["handle.resolve", "handle.resolve.load"] }),
    ),
    s.step(
      "an unclaimed name has no public page",
      s.visitor.run(get, { handle: "firstpage" }),
      refuses(ProfileNotFound),
      noEvents(),
    ),
    s.step(
      "aaron cannot add a link before he has a page",
      s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
      refuses(LinkNeedsHandle),
      noEvents(),
      spans({ absent: ["link.add.record"] }),
    ),
    s.step(
      "aaron claims the free name",
      s.aaron.run(claim, { name: "firstpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim", "handle.claim.record", "handle.claim.commit"] }),
    ),
    s.step(
      "the name now resolves to a handle",
      s.visitor.run(resolve, { name: "firstpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      noEvents(),
    ),
    s.step(
      "the claim made a public page, with no links yet",
      s.visitor.run(get, { handle: "firstpage" }),
      expect((a) => a).toEqual({ handle: "firstpage", links: [] }),
      noEvents(),
    ),
    s.step(
      "aaron cannot claim a second name while he holds one",
      s.aaron.run(claim, { name: "secondpage" }),
      refuses(HandleAlreadyOwned),
      noEvents(),
      spans({ absent: ["handle.claim.commit"] }),
    ),
    s.step(
      "the refused second name is still free",
      s.visitor.run(resolve, { name: "secondpage" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
  ],
});
