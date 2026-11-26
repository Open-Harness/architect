// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import record from "../things/safe/verbs/record.ts";

/** From ada has a safe: Bo has recorded his own Safe too, under the request `bo-safe`. */
export default Blueprint.startingWorld("ada and bo have safes", {
  from: "ada has a safe",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [s.bo.run(record, {}, { request: "bo-safe" })],
  gives: (s) => ({
    company: s.world.company,
    otherCompany: s.world.otherCompany,
    boCompany: s.world.boCompany,
    adaSafe: s.world.adaSafe,
    adaAccount: s.world.adaAccount,
    boSafe: s.last.safe,
    boAccount: s.last.account,
  }),
});
