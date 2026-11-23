import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Eval, {
  description: "Make an eval for one thread's waiting triggers.",
  payload: { superagent: Eval.fields.superagent, thread: Eval.fields.thread, triggers: Eval.fields.triggers, timeoutMs: Eval.fields.timeoutMs },
  answer: { eval: Eval.fields.id },
  move: machine.moves.started,
  allowed: [Blueprint.system],
});
