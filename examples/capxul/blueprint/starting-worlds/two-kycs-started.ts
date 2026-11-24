// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import start from "../things/bridge-individual/verbs/start.ts";

/** From kyc started: Bo has started his own KYC too, with a form and terms of his own. */
export default Blueprint.startingWorld("two kycs started", {
  from: "kyc started",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [s.bo.run(start, { fullName: "Bo Otieno", email: "bo@bo-ltd.test" }, { request: "bo-kyc" })],
  gives: (s) => ({
    individual: s.world.individual,
    kycLink: s.world.kycLink,
    tosLink: s.world.tosLink,
    boIndividual: s.last.individual,
    boKycLink: s.last.kycLink,
    boTosLink: s.last.tosLink,
  }),
});
