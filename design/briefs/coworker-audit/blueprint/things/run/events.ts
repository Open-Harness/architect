import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";

export const RunStarted = Blueprint.event({ run: Run.fields.id, manager: Run.fields.manager, task: Run.fields.task, agent: Run.fields.agent, brief: Run.fields.brief });
/** Every report wakes the run's manager. In the old app a report changed a field and woke nobody. */
export const RunReported = Blueprint.event({ run: Run.fields.id, manager: Run.fields.manager, task: Run.fields.task, report: Run.fields.report, note: Run.fields.note });
export const RunEnded = Blueprint.event({ run: Run.fields.id, manager: Run.fields.manager, task: Run.fields.task, report: Run.fields.report });
export const RunStopped = Blueprint.event({ run: Run.fields.id, manager: Run.fields.manager, agent: Run.fields.agent });
