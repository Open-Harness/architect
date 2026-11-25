import { Blueprint } from "orthograph";
import { Goal } from "./thing.ts";

export const GoalCreated = Blueprint.event({ goal: Goal.fields.id, employee: Goal.fields.employee, kra: Goal.fields.kra });
export const GoalProgressUpdated = Blueprint.event({ goal: Goal.fields.id });
export const GoalCompleted = Blueprint.event({ goal: Goal.fields.id });
export const GoalArchived = Blueprint.event({ goal: Goal.fields.id });
export const GoalClosed = Blueprint.event({ goal: Goal.fields.id });
export const GoalUnarchived = Blueprint.event({ goal: Goal.fields.id });
export const GoalReopened = Blueprint.event({ goal: Goal.fields.id });
