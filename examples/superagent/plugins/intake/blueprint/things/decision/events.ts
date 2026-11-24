import { Blueprint } from "orthograph";
import { Decision } from "./thing.ts";

export const DecisionRecorded = Blueprint.event({ superagent: Decision.fields.superagent, decision: Decision.fields.id, eval: Decision.fields.eval });
export const DecisionDismissed = Blueprint.event({ decision: Decision.fields.id });
