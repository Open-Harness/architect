import { Blueprint } from "orthograph";
import { Watch } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Watch, {
  description: "Put the next check off: forty minutes from now.",
  payload: { watch: Watch.fields.id },
  answer: { nextCheckAt: Watch.fields.nextCheckAt },
  move: machine.moves.snooze,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
