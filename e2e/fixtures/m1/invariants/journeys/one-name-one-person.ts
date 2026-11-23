// A fixture journey (check 25, G5): it reaches both refusals the rules make, from the journey's own steps. Written by the checks author.
import { Blueprint, emits, refuses } from "orthograph";
import { HandleAlreadyOwned, HandleTaken } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";

export default Blueprint.journey("one name, one person", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "aaron claims a name",
      s.aaron.run(claim, { name: "aaronpage", owner: "aaron" }),
      emits(HandleClaimed, { handle: s.last.handle }),
    ),
    s.step("a taken name is refused", s.bob.run(claim, { name: "aaronpage", owner: "bob" }), refuses(HandleTaken)),
    s.step("a second name for aaron is refused", s.aaron.run(claim, { name: "another", owner: "aaron" }), refuses(HandleAlreadyOwned)),
  ],
});
