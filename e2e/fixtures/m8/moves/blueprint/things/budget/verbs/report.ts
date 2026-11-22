import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, on the calendar day its anchor names.
export default Blueprint.operation(Budget, {
  description: "Report the month's spending.",
  payload: { budget: Budget.fields.id },
  answer: { at: Budget.fields.openedAt },
  move: machine.moves.report,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
