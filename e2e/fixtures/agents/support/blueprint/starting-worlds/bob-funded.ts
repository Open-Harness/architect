// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/organization/roles.ts";
import { grantee } from "../things/allowance/roles.ts";
import grant from "../things/allowance/verbs/grant.ts";

/** From bob-invited: ada has granted bob an allowance of 500, and the invitation is still pending. */
export default Blueprint.startingWorld("bob-funded", {
  from: "bob-invited",
  cast: { ada: owner, bob: grantee },
  makes: (s) => [s.ada.run(grant, { organization: s.world.organization, member: s.bob.person, limit: 500n })],
  gives: (s) => ({ organization: s.world.organization, invitation: s.world.invitation, allowance: s.last.allowance }),
});
