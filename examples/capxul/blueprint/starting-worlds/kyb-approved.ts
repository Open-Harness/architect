// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import approve from "../things/bridge-business/verbs/approve.ts";

/** From kyb started: Bridge has approved Acme Trading's KYB, so it may open bank accounts. */
export default Blueprint.startingWorld("kyb approved", {
  from: "kyb started",
  cast: { bridge: Blueprint.system },
  makes: (s) => [s.bridge.run(approve, { business: s.world.business })],
  gives: (s) => ({ company: s.world.company, business: s.world.business }),
});
