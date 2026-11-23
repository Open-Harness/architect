import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";

export default Blueprint.operation(Trigger, {
  description: "Ask the main agent to judge a trigger again.",
  payload: {
    trigger: Trigger.fields.id,
  },
  answer: {},
  allowed: [Blueprint.signedIn],
});
