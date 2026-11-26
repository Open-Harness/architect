import { Blueprint } from "orthograph";
import { Watch } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, at `nextCheckAt`.
export default Blueprint.operation(Watch, {
  description: "Observe once more, and back off: the next check two hours after a first, four after a second, and park after a third.",
  payload: { watch: Watch.fields.id },
  answer: { checks: Watch.fields.checks, nextCheckAt: Watch.fields.nextCheckAt },
  move: machine.moves.observe,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
