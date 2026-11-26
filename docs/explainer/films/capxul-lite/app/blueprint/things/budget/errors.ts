import { Blueprint } from "orthograph";
import { Usdc } from "../../values/money.ts";

// A refusal is declared once. It keeps one name and one code, wherever it is raised.
export class BudgetExceeded extends Blueprint.error({ remaining: Usdc }, { exit: 41 }) {}
