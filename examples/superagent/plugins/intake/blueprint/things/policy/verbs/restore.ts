import { Blueprint } from "orthograph";
import { Policy } from "../thing.ts";
import { machine } from "../machine.ts";
import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";

export default Blueprint.operation(Policy, {
  description: "Save an earlier version again, as a new one.",
  payload: { superagent: Policy.fields.superagent, revision: Policy.fields.revision, base: Blueprint.uint(32) },
  answer: { revision: Policy.fields.revision },
  move: machine.moves.restore,
  errors: [StaleRevision],
  allowed: [Blueprint.signedIn],
});
