import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";
import { proposed, WHY_MAX } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Policy, {
  description: "List the accounts a connection's roster names.",
  payload: {
    superagent: Policy.fields.superagent,
    source: Blueprint.text({ max: 60 }),
    why: Blueprint.optional(Blueprint.text({ max: WHY_MAX })),
  },
  answer: {},
  allowed: [Blueprint.signedIn],
  proposes: proposed({}),
});
