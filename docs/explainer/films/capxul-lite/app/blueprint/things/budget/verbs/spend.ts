import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";
import { holder } from "../roles.ts";
import { Spend } from "../../spend/thing.ts";
import { Recipient, Usdc } from "../../../values/money.ts";

// A chain operation declares no steps and no request key (M6-chain item 8).
export default Blueprint.operation(Budget, {
  description: "Pay someone from the treasury, out of this budget.",
  payload: { budget: Budget.fields.id, amount: Usdc, to: Recipient, note: Spend.fields.id },
  answer: { remaining: Usdc },
  move: machine.moves.spend,
  allowed: [holder],
  budget: { p95: "5 seconds" }, // judged on the time to included
});
