import { Blueprint } from "orthograph";
import { Interview } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// The owner decides; the feedback given doesn't decide it, and the applicant isn't moved (HRMS only offers to).
export default Blueprint.operation(Interview, {
  description: "Mark an interview rejected.",
  payload: { interview: Interview.fields.id },
  answer: { interview: Interview.fields.id },
  move: machine.moves.reject,
  allowed: [owner.of("interview.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
