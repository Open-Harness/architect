import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleNotFound } from "../errors.ts";

// Reads by a rule: the handler asks `findBy(oneHolderPerName, name)`, and the scope comes from the rule (G5 section 4).
export default Blueprint.operation(Handle, {
  description: "Find the handle that holds a name.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  errors: [HandleNotFound],
  allowed: [Blueprint.anyone],
  steps: { look: Blueprint.step.database() },
});
