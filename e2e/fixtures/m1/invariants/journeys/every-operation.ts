// A fixture journey (check 32, ST1.18), with owners of its own (`eo-aaron`, `eo-bob`): journeys share one world, and "one name, one person" makes `aaron` hold a name: it calls every operation of the fixture once and refuses every error a handler declares, so prove's coverage (an operation no
// journey reaches, a declared error no step refuses) is satisfied without the rules' own refusals, which "one name, one person" reaches. Written by the checks author.
import { Blueprint, emits, noEvents, refuses } from "orthograph";
import { HandleNotFound } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed, HandleReleased } from "../blueprint/things/handle/events.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import release from "../blueprint/things/handle/verbs/release.ts";
import rename from "../blueprint/things/handle/verbs/rename.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import { ProfileMade } from "../blueprint/things/profile/events.ts";
import get from "../blueprint/things/profile/verbs/get.ts";
import make from "../blueprint/things/profile/verbs/make.ts";

export default Blueprint.journey("every operation once", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step("aaron claims a name", s.aaron.run(claim, { name: "everyaaron", owner: "eo-aaron" }), emits(HandleClaimed, { handle: s.last.handle })),
    s.step("aaron makes his page", s.aaron.run(make, { handle: s.last.handle }), emits(ProfileMade, { profile: s.last.profile })),
    s.step("bob claims another name", s.bob.run(claim, { name: "everybob", owner: "eo-bob" }), emits(HandleClaimed, { handle: s.last.handle })),
    s.step("bob has no page yet", s.visitor.run(get, { handle: s.last.handle }), refuses(ProfileNotFound)),
    s.step("the name resolves to bob's handle", s.visitor.run(resolve, { name: "everybob" }), noEvents()),
    s.step("bob renames it", s.bob.run(rename, { handle: s.last.handle, name: "everybobby" }), noEvents()),
    s.step("the new name resolves", s.visitor.run(resolve, { name: "everybobby" }), noEvents()),
    s.step("bob lets it go", s.bob.run(release, { handle: s.last.handle }), emits(HandleReleased, {})),
    s.step("a released name resolves to no one", s.visitor.run(resolve, { name: "everybobby" }), refuses(HandleNotFound)),
  ],
});
