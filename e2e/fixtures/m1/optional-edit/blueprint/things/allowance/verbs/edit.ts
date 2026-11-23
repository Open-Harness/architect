import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { owner } from "../../organization/roles.ts";
import { Amount } from "../../../values/money.ts";

export default Blueprint.operation(Allowance, {
  description: "Change the allowance's limit if it differs.",
  allowed: [owner.of("allowance.organization")],
  payload: { allowance: Allowance.fields.id, limit: Amount },
  answer: { limit: Amount },
  steps: { load: Blueprint.step.database(), save: Blueprint.step.database({ optional: true }) },
});
