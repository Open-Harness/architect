// Journey-author file (m2 check 12): a starting world that moves no clock, so its day is the environment's start.
import { Blueprint } from "orthograph";

/** Ada is signed in. The world gives her person id as it is before any step moves the clock. */
export default Blueprint.startingWorld("ada is here", {
  cast: { ada: Blueprint.signedIn },
  makes: () => [],
  gives: (s) => ({ ada: s.ada.person }),
});
