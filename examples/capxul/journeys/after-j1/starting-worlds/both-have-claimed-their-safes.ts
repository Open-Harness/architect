// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import claim from "../../../blueprint/things/personal-safe/verbs/claim.ts";
import { signing } from "../../support/signing.ts";

/** From ada has claimed her safe: Bo's agent has claimed Bo's through MCP, with Bo's own signer. */
export default Blueprint.startingWorld("both have claimed their safes", {
  from: "ada has claimed her safe",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [
    signing(s.bo).signs(["Capxul: claim Safe ", s.world.boSafe, " for ", s.bo.person]),
    s.bo.via(Via.agent).run(claim, { safe: s.world.boSafe, signer: s.last.signer, proof: s.last.signature }),
  ],
  gives: (s) => ({ adaSafe: s.world.adaSafe, adaAccount: s.world.adaAccount, boSafe: s.world.boSafe, boAccount: s.last.account }),
});
