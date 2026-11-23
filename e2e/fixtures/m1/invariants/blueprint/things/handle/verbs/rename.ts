import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";

// The blind spot (G5 section 3): no move and a default step, so the compiler cannot see that it may break `oneHolderPerName`.
// The runtime then dies naming the rule and this operation, and the author's fix is `writes: [Handle]` on the step.
export default Blueprint.operation(Handle, {
  description: "Change the name a handle holds.",
  payload: { handle: Handle.fields.id, name: Handle.fields.name },
  answer: {},
  allowed: [Blueprint.anyone],
  steps: { update: Blueprint.step.database() },
});
