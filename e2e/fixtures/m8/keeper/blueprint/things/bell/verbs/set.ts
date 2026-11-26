import { Blueprint } from "orthograph";
import { Bell } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Bell, {
  description: "Set a bell now, by the world's clock: it chimes an hour later.",
  payload: { name: Bell.fields.name },
  answer: { bell: Bell.fields.id, setAt: Bell.fields.setAt },
  move: machine.moves.set,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
