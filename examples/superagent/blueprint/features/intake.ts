import { Blueprint } from "orthograph";
import intake, { things } from "@orthograph/intake";
import { SuperagentCreated, SuperagentResumed } from "@orthograph/superagent/blueprint/things/superagent/events.ts";

/**
 * The eval pass starts with a superagent and again when a pause ends. Plugins stay independent, so the app wires what crosses
 * them: these two events are `superagent`'s, and `eval.due` is `intake`'s (GOAL17-pause: both are unheld).
 */
export default Blueprint.use(intake, (i) => [
  i.on(SuperagentCreated, things.eval.operations.due, (e) => ({ superagent: e.superagent })),
  i.on(SuperagentResumed, things.eval.operations.due, (e) => ({ superagent: e.superagent })),
]);
