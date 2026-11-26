import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Run, {
  description: "The worker's turn ended without a report. The run ends, and its manager is told.",
  payload: { agent: Run.fields.agent },
  answer: {},
  move: machine.moves.idled,
  allowed: [Blueprint.system],
  steps: { record: Blueprint.step.database() },
});
