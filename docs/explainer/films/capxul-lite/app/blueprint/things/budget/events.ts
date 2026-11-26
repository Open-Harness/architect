import { Blueprint } from "orthograph";
import { Budget } from "./thing.ts";
import { Reason, Recipient, Usdc } from "../../values/money.ts";

// Every move records one event. On chain each also carries who signed, and their nonce.
export const BudgetGranted = Blueprint.event({ budget: Budget.fields.id, holder: Budget.fields.holder, limit: Budget.fields.limit });
export const BudgetSpent = Blueprint.event({
  budget: Budget.fields.id,
  amount: Usdc,
  to: Recipient,
  remaining: Usdc,
  reason: Blueprint.sealed(Reason), // new: the chain carries its seal, never its words
});
export const BudgetRenewed = Blueprint.event({ budget: Budget.fields.id });
export const BudgetRevoked = Blueprint.event({ budget: Budget.fields.id });
