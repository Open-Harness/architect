import { Blueprint } from "orthograph";
import { Meter } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Meter, {
  description: "Start a meter now, by the world's clock: the keeper reads it every hour from now.",
  payload: { name: Meter.fields.name },
  answer: { meter: Meter.fields.id, startedAt: Meter.fields.startedAt },
  move: machine.moves.start,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
