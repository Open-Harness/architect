import { Blueprint } from "orthograph";
import { Task } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { itsManager } from "../../manager/roles.ts";

export default Blueprint.operation(Task, {
  description: "Move a task to another lane. A lane that asks first is left only on a person's yes.",
  payload: { task: Task.fields.id, lane: Task.fields.lane },
  answer: {},
  move: machine.moves.move,
  allowed: [member.of("task.manager"), itsManager.of("task.manager")],
  steps: { record: Blueprint.step.database() },
  // GAP grants: on, ask or off per action, per manager, handed down the tree, is not a role the blueprint can say.
  // See ../grant/thing.ts. Until then `allowed` is the widest set and a guard in the handler reads the grant.
});
