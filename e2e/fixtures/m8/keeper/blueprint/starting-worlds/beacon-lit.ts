// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import light from "../things/beacon/verbs/light.ts";

/** Aaron lit the beacon the moment the world started: 10 January 2027, nine in the morning UTC. */
export default Blueprint.startingWorld("beacon-lit", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(light, { name: "Harbour" })],
  gives: (s) => ({ beacon: s.last.beacon }),
});
