import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { itsManager } from "../../manager/roles.ts";

export default Blueprint.operation(Run, {
  description: "Start a worker on a task, with a brief. The worker is a new agent; it reports back to this manager.",
  payload: { task: Run.fields.task, role: Run.fields.role, brief: Run.fields.brief, from: Run.fields.from },
  answer: { run: Run.fields.id },
  move: machine.moves.start,
  allowed: [itsManager.of("task.manager"), member.of("task.manager")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
});
