import { Blueprint } from "orthograph";
import { Purse } from "../thing.ts";
import { machine } from "../machine.ts";

// Worked out at the purse's next use, never fired by the keeper on its own.
export default Blueprint.operation(Purse, {
  description: "Start a new month: nothing spent yet.",
  payload: { purse: Purse.fields.id },
  answer: { period: Purse.fields.period },
  move: machine.moves.refill,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
