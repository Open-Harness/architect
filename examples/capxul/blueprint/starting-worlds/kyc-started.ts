// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import start from "../things/bridge-individual/verbs/start.ts";

/** Ada has started her own KYC with Bridge, and has its form and Bridge's terms to open. */
export default Blueprint.startingWorld("kyc started", {
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.run(start, { fullName: "Ada Wanjiru Kamau", email: "ada@acme-trading.test" }, { request: "ada-kyc" })],
  gives: (s) => ({ individual: s.last.individual, kycLink: s.last.kycLink, tosLink: s.last.tosLink }),
});
