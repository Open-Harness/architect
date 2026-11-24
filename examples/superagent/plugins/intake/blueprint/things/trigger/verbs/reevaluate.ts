import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { Eval } from "../../eval/thing.ts";

export default Blueprint.operation(Trigger, {
  description: "Ask the main agent to judge a trigger again.",
  payload: {
    trigger: Trigger.fields.id,
  },
  answer: {},
  allowed: [Blueprint.signedIn],
  // The trigger is never changed: what lets it be judged again is that it leaves the unavailable evals that hold it.
  steps: { release: Blueprint.step.database({ writes: [Eval] }) },
});
