import { Blueprint } from "orthograph";
import { Bell } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, an hour after the bell was set.
export default Blueprint.operation(Bell, {
  description: "Chime the bell once more.",
  payload: { bell: Bell.fields.id },
  answer: { chimes: Bell.fields.chimes },
  move: machine.moves.chime,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
