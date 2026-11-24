import { Blueprint } from "orthograph";
import { ExpenseClaimType } from "./thing.ts";
import { ExpenseTypeTaken } from "./errors.ts";

// HRMS names a type by its name, so a company has one type of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([ExpenseClaimType.fields.company, ExpenseClaimType.fields.expenseType], {
  refuse: ExpenseTypeTaken,
});
