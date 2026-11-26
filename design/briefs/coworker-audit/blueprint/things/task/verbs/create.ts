import { Blueprint } from "orthograph";
import { Task } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { itsManager } from "../../manager/roles.ts";

export default Blueprint.operation(Task, {
  description: "Add a task to a manager's board.",
  payload: { manager: Task.fields.manager, title: Task.fields.title, why: Task.fields.why, lane: Task.fields.lane },
  answer: { task: Task.fields.id },
  move: machine.moves.create,
  allowed: [member.of("manager"), itsManager.of("manager")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
});
