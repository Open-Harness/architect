import { Blueprint } from "orthograph";
import { Meter } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Meter, {
  description: "Free a jammed meter.",
  payload: { meter: Meter.fields.id },
  answer: {},
  move: machine.moves.free,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
