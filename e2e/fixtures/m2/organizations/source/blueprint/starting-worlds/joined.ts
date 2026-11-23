// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, type Allowed, type StartingWorld } from "orthograph";
import { owner } from "../things/organization/roles.js";
import accept from "../things/invitation/verbs/accept.js";

/** From invited: olga has accepted ada's invitation and is a member. */
const world: StartingWorld<{ readonly ada: Allowed; readonly olga: Allowed }> = Blueprint.startingWorld("joined", {
  from: "invited",
  cast: { ada: owner, olga: Blueprint.signedIn },
  makes: (s) => [s.olga.run(accept, { invitation: s.world.invitation })],
  gives: (s) => ({ organization: s.world.organization, membership: s.last.membership }),
});

export default world;
