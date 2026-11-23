import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";

export default Blueprint.operation(Account, {
  description: "List the accounts a connection's own roster names: a repository's collaborators, a user group.",
  payload: { superagent: Account.fields.superagent, source: Account.fields.source },
  answer: {  },
  allowed: [Blueprint.signedIn],
});
