import { Blueprint } from "orthograph";
import { ExpenseClaim } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ERPNext submits with approval_status Rejected and sanctions nothing: the claim's sanctioned total becomes 0. Its
// expenses' own sanctioned amounts are left as they were until a claim's expenses can be listed (#764).
export default Blueprint.operation(ExpenseClaim, {
  description: "Reject a claim, so nothing of it is paid back.",
  payload: { expenseClaim: ExpenseClaim.fields.id },
  answer: { expenseClaim: ExpenseClaim.fields.id },
  move: machine.moves.reject,
  allowed: [owner.of("expenseClaim.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
