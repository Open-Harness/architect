import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";
import { machine } from "../machine.ts";
import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";

export default Blueprint.operation(Policy, {
  description: "Save a new version of the policy. A save made from an older version is refused, with the current one.",
  payload: {
    superagent: Policy.fields.superagent,
    base: Blueprint.uint(32),
    mode: Policy.fields.mode,
    allowed: Policy.fields.allowed,
    bots: Policy.fields.bots,
    admission: Policy.fields.admission,
    rules: Policy.fields.rules,
  },
  answer: {
    revision: Policy.fields.revision,
  },
  move: machine.moves.save,
  errors: [StaleRevision],
  allowed: [Blueprint.signedIn],
});
