import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { machine } from "../machine.ts";
import { EvalStarted } from "../events.ts";

export default Blueprint.operation(Eval, {
  description: "Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it.",
  payload: {
    eval: Eval.fields.id,
  },
  answer: {},
  move: machine.moves.delivered,
  allowed: [Blueprint.system],
  on: [Blueprint.on(EvalStarted, (e) => ({ eval: e.eval }))],
});
