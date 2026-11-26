import { Blueprint } from "orthograph";
import { Task } from "./thing.ts";

export const TaskCreated = Blueprint.event({ task: Task.fields.id, manager: Task.fields.manager, title: Task.fields.title });
export const TaskMoved = Blueprint.event({ task: Task.fields.id, manager: Task.fields.manager, lane: Task.fields.lane });
export const TaskFinished = Blueprint.event({ task: Task.fields.id, manager: Task.fields.manager });
export const TaskDropped = Blueprint.event({ task: Task.fields.id, manager: Task.fields.manager });
export const TaskReopened = Blueprint.event({ task: Task.fields.id, manager: Task.fields.manager });
