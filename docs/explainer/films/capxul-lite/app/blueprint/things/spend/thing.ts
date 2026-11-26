import { Blueprint } from "orthograph";
import { Budget } from "../budget/thing.ts";
import { Reason, Usdc } from "../../values/money.ts";

// No `lives`: it gets the project's database.
// The accountant needs lists and reports, and a contract has neither.
export const Spend = Blueprint.thing({
  description: "A payment out of a budget, with its reason. What the accountant sees.",
  code: "SP",
  fields: {
    id: Blueprint.id("spd"),
    budget: Budget.fields.id,
    to: Blueprint.account(),
    amount: Usdc,
    reason: Blueprint.visibility.private(Reason),
    transaction: Blueprint.text({ max: 128 }),
  },
});
