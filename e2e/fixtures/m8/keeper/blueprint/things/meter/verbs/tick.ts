import { Blueprint } from "orthograph";
import { Meter } from "../thing.ts";
import { machine } from "../machine.ts";
import { MeterJammed } from "../errors.ts";

// Called only by the keeper, every hour.
export default Blueprint.operation(Meter, {
  description: "Read the meter once more; a jammed meter refuses.",
  payload: { meter: Meter.fields.id },
  answer: { ticks: Meter.fields.ticks, at: Meter.fields.startedAt },
  move: machine.moves.tick,
  errors: [MeterJammed],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
