import { Blueprint } from "orthograph";
import { PromptSet } from "../thing.ts";

export default Blueprint.operation(PromptSet, {
  description: "Make the prompt for one agent's model request, from the current version.",
  payload: {
    superagent: PromptSet.fields.superagent,
    role: Blueprint.text({ max: 40 }),
  },
  answer: {
    text: Blueprint.text({ max: 65536 }),
  },
  allowed: [Blueprint.system],
});
