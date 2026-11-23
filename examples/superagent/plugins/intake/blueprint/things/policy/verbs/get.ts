import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Policy, {
  description: "Read the policy: the current version, or the one named.",
  payload: { superagent: Policy.fields.superagent, revision: Blueprint.optional(Blueprint.uint(32)) },
  answer: { revision: Policy.fields.revision, mode: Policy.fields.mode, allowed: Policy.fields.allowed, bots: Policy.fields.bots, admission: Policy.fields.admission, rules: Policy.fields.rules },
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
