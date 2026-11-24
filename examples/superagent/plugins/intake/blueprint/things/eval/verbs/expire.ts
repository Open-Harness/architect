import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Eval, {
  description: "Give up on an eval that ran out of time: it is unavailable, and keeps its triggers until a person reevaluates one.",
  payload: {
    eval: Eval.fields.id,
  },
  answer: {},
  move: machine.moves.expired,
  allowed: [Blueprint.system],
});
