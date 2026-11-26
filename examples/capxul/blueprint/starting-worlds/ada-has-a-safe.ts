// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import record from "../things/safe/verbs/record.ts";

/** From three companies: Ada has recorded her own Safe, under the request `ada-safe`. Bo has none. */
export default Blueprint.startingWorld("ada has a safe", {
  from: "three companies",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.run(record, {}, { request: "ada-safe" })],
  gives: (s) => ({
    company: s.world.company,
    otherCompany: s.world.otherCompany,
    boCompany: s.world.boCompany,
    adaSafe: s.last.safe,
    adaAccount: s.last.account,
  }),
});
