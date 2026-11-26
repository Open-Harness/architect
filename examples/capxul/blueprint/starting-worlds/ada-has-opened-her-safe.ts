// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import open from "../things/personal-safe/verbs/open.ts";

/** Ada has opened her own Safe from the command line (her key), under the request `ada-safe`. Bo has none. */
export default Blueprint.startingWorld("ada has opened her safe", {
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.via(Via.key).run(open, {}, { request: "ada-safe" })],
  gives: (s) => ({ adaSafe: s.last.safe }),
});
