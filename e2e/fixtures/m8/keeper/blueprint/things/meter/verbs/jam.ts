import { Blueprint } from "orthograph";
import { Meter } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Meter, {
  description: "Jam the meter: readings are refused until it is freed.",
  payload: { meter: Meter.fields.id },
  answer: {},
  move: machine.moves.jam,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
