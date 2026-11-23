// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { treasury, grantee } from "../things/allowance/roles.ts";
import grant from "../things/allowance/verbs/grant.ts";

/** From funded: the Safe, through ada, has granted olga 500 of the test token. */
export default Blueprint.startingWorld("granted", {
  from: "funded",
  cast: { ada: treasury, olga: grantee },
  makes: (s) => [s.ada.run(grant, { safe: s.world.safe, member: s.olga.account, token: s.world.token, limit: 500n })],
  gives: (s) => ({ safe: s.world.safe, token: s.world.token, allowance: s.last.allowance }),
});
