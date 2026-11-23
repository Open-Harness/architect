import { Blueprint } from "orthograph";
import { PromptSet } from "../thing.ts";

export default Blueprint.operation(PromptSet, {
  description: "Show the prompt an agent of one kind would get, with a draft applied.",
  payload: { superagent: PromptSet.fields.superagent, role: Blueprint.text({ max: 40 }), sections: PromptSet.fields.sections },
  answer: { text: Blueprint.text({ max: 65536 }) },
  allowed: [Blueprint.signedIn],
});
