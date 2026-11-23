// Journey-author file. The builder of handle.claim never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleTaken } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";

export default Blueprint.journey("a name is claimed once", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "claimed",
  steps: (s) => [
    s.step(
      "the same request again answers the same handle and claims nothing",
      s.aaron.run(claim, { name: "claimedname" }, { request: "first-claim" }),
      expect((a) => a.handle).toBe(s.world.handle),
      noEvents(),
      spans({ absent: ["handle.claim.record"] }),
      machine.isIn(s.world.handle, "claimed"),
    ),
    s.step(
      "a taken name is refused",
      s.bob.run(claim, { name: "claimedname" }, { request: "bobs-claim" }),
      refuses(HandleTaken),
      noEvents(),
      spans({ present: ["handle.claim"], absent: ["handle.claim.commit"] }),
    ),
    s.step(
      "another person's request key is not aaron's: still refused",
      s.bob.run(claim, { name: "claimedname" }, { request: "first-claim" }),
      refuses(HandleTaken),
      noEvents(),
      spans({ absent: ["handle.claim.commit"] }),
    ),
    s.step(
      "the name still resolves to aaron's handle",
      s.visitor.run(resolve, { name: "claimedname" }),
      expect((a) => a.handle).toBe(s.world.handle),
      noEvents(),
      spans({ present: ["handle.resolve", "handle.resolve.load"] }),
    ),
    s.step(
      "the refusal left bob free to claim a name of his own",
      s.bob.run(claim, { name: "bobspage" }),
      emits(HandleClaimed, { handle: s.last.handle, name: "bobspage" }),
      machine.isIn(s.last.handle, "claimed"),
    ),
  ],
});
