import { Blueprint } from "orthograph";
import { Organization } from "../thing.js";
import { machine } from "../machine.js";

export default Blueprint.operation(Organization, {
  description: "Found an organisation. Whoever founds it owns it, and is its first member.",
  payload: { name: Organization.fields.name },
  answer: { organization: Organization.fields.id },
  move: machine.moves.create,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database(), owner: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "250 millis" },
});
