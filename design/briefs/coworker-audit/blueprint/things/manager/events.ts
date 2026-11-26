import { Blueprint } from "orthograph";
import { Manager } from "./thing.ts";
import { Note, Body } from "../../values/coworker.ts";

export const ManagerCreated = Blueprint.event({ manager: Manager.fields.id, above: Manager.fields.above, agent: Manager.fields.agent });
export const ManagerPaused = Blueprint.event({ manager: Manager.fields.id, why: Note });
export const ManagerResumed = Blueprint.event({ manager: Manager.fields.id });
export const ManagerRetired = Blueprint.event({ manager: Manager.fields.id });
/** The one path that wakes a manager: a chat line, a run's report, an answer, a comment, a move, a trigger, a date. */
export const ManagerWoken = Blueprint.event({ manager: Manager.fields.id, agent: Manager.fields.agent, wake: Blueprint.text({ max: 120 }), what: Body });
