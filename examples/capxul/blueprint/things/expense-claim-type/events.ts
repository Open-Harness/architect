import { Blueprint } from "orthograph";
import { ExpenseClaimType } from "./thing.ts";

export const ExpenseClaimTypeCreated = Blueprint.event({ expenseClaimType: ExpenseClaimType.fields.id, company: ExpenseClaimType.fields.company });
