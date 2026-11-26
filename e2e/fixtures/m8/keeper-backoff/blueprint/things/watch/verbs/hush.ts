import { Blueprint } from "orthograph";
import { Watch } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Watch, {
  description: "Stop checking for now: clear the next check, and stay watching.",
  payload: { watch: Watch.fields.id },
  answer: {},
  move: machine.moves.hush,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
