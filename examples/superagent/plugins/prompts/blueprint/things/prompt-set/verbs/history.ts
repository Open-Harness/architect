import { Blueprint } from "orthograph";
import { PromptSet } from "../thing.ts";

export default Blueprint.operation(PromptSet, {
  description: "Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step.",
  payload: { superagent: PromptSet.fields.superagent },
  answer: { revision: Blueprint.list(Blueprint.uint(32)), at: Blueprint.list(Blueprint.uint(64)), by: Blueprint.list(Blueprint.text({ max: 120 })), from: Blueprint.list(Blueprint.uint(32)) },
  allowed: [Blueprint.signedIn],
});
