import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { Report, Note } from "../../../values/coworker.ts";

const itsWorker = Blueprint.role(Run, { agent: Run.fields.agent });

export default Blueprint.operation(Run, {
  description: "A worker says how it is going. Ready, failed or dropped ends the run. Any report wakes its manager.",
  payload: { run: Run.fields.id, report: Report, note: Note },
  answer: {},
  move: Blueprint.todo("GAP move-by-payload: one verb picks among report, wait and end by its payload; today one operation names one move"),
  allowed: [itsWorker],
  steps: { record: Blueprint.step.database() },
});
