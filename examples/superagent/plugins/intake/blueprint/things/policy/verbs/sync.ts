import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";

export default Blueprint.operation(Policy, {
  description: "List the accounts a connection's roster names.",
  payload: {
    superagent: Policy.fields.superagent,
    source: Blueprint.text({ max: 60 }),
  },
  answer: {},
  allowed: [Blueprint.signedIn],
});
