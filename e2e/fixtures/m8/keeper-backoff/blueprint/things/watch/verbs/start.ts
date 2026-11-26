import { Blueprint } from "orthograph";
import { Watch } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Watch, {
  description: "Start watching now, by the world's clock: the first check is an hour from now.",
  payload: { name: Watch.fields.name },
  answer: { watch: Watch.fields.id, nextCheckAt: Watch.fields.nextCheckAt },
  move: machine.moves.start,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
