import { Blueprint } from "orthograph";
import { ExpenseClaim } from "../thing.ts";
import { machine } from "../machine.ts";
import { ClaimHasNoExpenses } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// ERPNext submits with approval_status Approved: the claim is owed what was sanctioned.
export default Blueprint.operation(ExpenseClaim, {
  description: "Approve a claim, owing the employee what was sanctioned.",
  payload: { expenseClaim: ExpenseClaim.fields.id },
  answer: { expenseClaim: ExpenseClaim.fields.id, totalSanctionedAmount: ExpenseClaim.fields.totalSanctionedAmount },
  move: machine.moves.approve,
  errors: [ClaimHasNoExpenses],
  allowed: [owner.of("expenseClaim.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
