import { Blueprint } from "orthograph";
import { Lamp } from "../thing.ts";
import { machine } from "../machine.ts";

// The budget is small on purpose: the check holds the handler in `wait` past it (a gate, no clock in the handler) and
// judges the counter, not the timing. An `origin` of "none" asks nobody, so the journey runs with no service to hold it.
export default Blueprint.operation(Lamp, {
  description: "Light a lamp once the slow service has answered.",
  payload: { origin: Blueprint.text({ max: 200 }) },
  answer: { lamp: Lamp.fields.id },
  move: machine.moves.glow,
  allowed: [Blueprint.anyone],
  steps: { wait: Blueprint.step.wait(), save: Blueprint.step.database() },
  budget: { p95: "500 millis" },
});
