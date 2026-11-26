// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import claim from "../../../blueprint/things/personal-safe/verbs/claim.ts";
import { signing } from "../../support/signing.ts";

/** From ada and bo have opened their safes: Ada has claimed hers from the command line (her key), with her own signer. */
export default Blueprint.startingWorld("ada has claimed her safe", {
  from: "ada and bo have opened their safes",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [
    signing(s.ada).signs(["Capxul: claim Safe ", s.world.adaSafe, " for ", s.ada.person]),
    s.ada.via(Via.key).run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }, { request: "ada-claim" }),
  ],
  gives: (s) => ({ adaSafe: s.world.adaSafe, boSafe: s.world.boSafe, adaAccount: s.last.account }),
});
