import { Blueprint } from "orthograph";
import { Eval } from "./thing.ts";

export const EvalStarted = Blueprint.event({ superagent: Eval.fields.superagent, eval: Eval.fields.id, thread: Eval.fields.thread });
export const EvalDelivered = Blueprint.event({ superagent: Eval.fields.superagent, eval: Eval.fields.id });
export const EvalDecided = Blueprint.event({ eval: Eval.fields.id });
export const EvalExpired = Blueprint.event({ eval: Eval.fields.id });
