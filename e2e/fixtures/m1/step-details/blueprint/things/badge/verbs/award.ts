import { Blueprint } from "orthograph";
import { Organization } from "../../organization/thing.ts";
import { Badge } from "../thing.ts";

// Check 20's fixture: a step with every detail the model can carry without an adapter. `save` may be skipped (`optional`)
// and writes an organisation as well as its own thing (`writes`), so the portal's step has more than a name and a type.
export default Blueprint.operation(Badge, {
  description: "Award a badge, and note it on the organisation.",
  payload: { title: Badge.fields.title },
  answer: { badge: Badge.fields.id },
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), save: Blueprint.step.database({ optional: true, writes: [Organization] }) },
  budget: { p95: "500 millis" },
});
