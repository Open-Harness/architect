import { Blueprint } from "orthograph";
import { superagentGoLive } from "../../kit/ops.ts";

export default Blueprint.startingWorld("a-live-superagent", {
  from: "an-observing-superagent",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [s.ann.run(superagentGoLive, { superagent: s.world.superagent })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent }),
});
