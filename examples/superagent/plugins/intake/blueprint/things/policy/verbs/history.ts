import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";

export default Blueprint.operation(Policy, {
  description: "Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step.",
  payload: { superagent: Policy.fields.superagent },
  answer: { revision: Blueprint.list(Blueprint.uint(32)), at: Blueprint.list(Blueprint.uint(64)), by: Blueprint.list(Blueprint.text({ max: 120 })), from: Blueprint.list(Blueprint.uint(32)) },
  allowed: [Blueprint.signedIn],
});
