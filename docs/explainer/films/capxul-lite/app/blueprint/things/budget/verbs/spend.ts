import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";
import { holder } from "../roles.ts";
import { BudgetExceeded } from "../errors.ts";
import { Reason, Recipient, Usdc } from "../../../values/money.ts";

// A chain operation declares no steps and no request key (M6-chain item 8).
export default Blueprint.operation(Budget, {
  description: "Pay someone from the treasury, out of this budget.",
  payload: {
    budget: Budget.fields.id,
    amount: Usdc,
    to: Recipient,
    reason: Blueprint.sealed(Reason), // new: private, and signed for all the same
  },
  answer: { remaining: Usdc },
  move: machine.moves.spend,
  allowed: [holder],
  errors: [BudgetExceeded],
  budget: { p95: "5 seconds" }, // judged on the time to included
});
