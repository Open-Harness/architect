# blueprint/journeys/handle-release-refused-not-handleOwner.ts
// Scaffolded from blueprint/things/handle/roles.ts. Yours from now on.
import { Blueprint, noEvents, refuses } from "orthograph";
import release from "../things/handle/verbs/release.ts";

/**
 * Who may call handle.release, from blueprint/things/handle/roles.ts:
 *   the handleOwner of the handle: (handle, caller) => handle.owner === caller.person
 * Refused: someone signed in who isn't the handleOwner of the handle calls handle.release, and nothing changes.
 */
export default Blueprint.journey("handle.release: refused a caller who isn't the handleOwner", {
  cast: { stranger: Blueprint.signedIn },
  starts: Blueprint.todo("a starting world where handle.release can run"),
  steps: (s) => [
    s.step(
      "the stranger calls handle.release",
      s.stranger.run(release, Blueprint.todo("handle.release's payload: handle")),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
