import { Blueprint } from "orthograph";
import superagentGoLive from "@orthograph/superagent/blueprint/things/superagent/verbs/go-live.ts";

/** `reply-an-observing-superagent`, gone live by ann. `superagent.goLive` answers `{}`, so the id comes from the world before, not `s.last`. */
export default Blueprint.startingWorld("reply-a-live-superagent", {
  from: "reply-an-observing-superagent",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [s.ann.run(superagentGoLive, { superagent: s.world.superagent })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent }),
});
