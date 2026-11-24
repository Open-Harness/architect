import { Blueprint } from "orthograph";
import { ExpenseClaim } from "./thing.ts";

export const ExpenseClaimCreated = Blueprint.event({
  expenseClaim: ExpenseClaim.fields.id,
  company: ExpenseClaim.fields.company,
  employee: ExpenseClaim.fields.employee,
});
export const ExpenseClaimApproved = Blueprint.event({
  expenseClaim: ExpenseClaim.fields.id,
  totalSanctionedAmount: ExpenseClaim.fields.totalSanctionedAmount,
});
export const ExpenseClaimRejected = Blueprint.event({ expenseClaim: ExpenseClaim.fields.id });
