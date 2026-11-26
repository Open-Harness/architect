import { Blueprint } from "orthograph";
import { Budget } from "../budget/thing.ts";
import { Reason, Receipt, Usdc } from "../../values/money.ts";

// No `lives`: it gets the project's database. It could not live on a chain:
// a public chain shows every field, and two of these are private.
export const Spend = Blueprint.thing({
  description: "Why money left the treasury: who was paid, for what, and the receipt.",
  code: "SP",
  fields: {
    id: Blueprint.id("spd"),
    budget: Budget.fields.id,
    by: Blueprint.id("per"),
    to: Blueprint.account(),
    amount: Usdc,
    reason: Blueprint.visibility.private(Reason),
    receipt: Blueprint.visibility.private(Receipt),
  },
});
