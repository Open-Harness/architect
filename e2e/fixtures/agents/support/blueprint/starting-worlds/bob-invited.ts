// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/organization/roles.ts";
import send from "../things/invitation/verbs/send.ts";

/** From founded: ada, who owns the organisation, has invited bob by his email. The invitation is pending. */
export default Blueprint.startingWorld("bob-invited", {
  from: "founded",
  cast: { ada: owner, bob: Blueprint.signedIn },
  makes: (s) => [s.ada.run(send, { organization: s.world.organization, email: s.bob.email })],
  gives: (s) => ({ organization: s.world.organization, invitation: s.last.invitation }),
});
