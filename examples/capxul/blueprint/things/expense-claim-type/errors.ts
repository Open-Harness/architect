import { Blueprint } from "orthograph";
import { ExpenseTypeName } from "../../values/expenses.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class ExpenseTypeTaken extends Blueprint.error({ expenseType: ExpenseTypeName }, { exit: 41 }) {}
