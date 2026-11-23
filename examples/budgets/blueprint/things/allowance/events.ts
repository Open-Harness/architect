import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";
import { Recipient } from "../../values/accounts.ts";

// On chain each event also carries `by` and `nonce` before these fields (M6-chain item 3).
export const AllowanceGranted = Blueprint.event({
  allowance: Allowance.fields.id,
  safe: Allowance.fields.safe,
  member: Allowance.fields.member,
  token: Allowance.fields.token,
  limit: Allowance.fields.limit,
});
// Every amount counts the allowance's token (M6-money item 1).
const Amount = Blueprint.money.of(Allowance.fields.token);

export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, amount: Amount, to: Recipient, remaining: Amount });
export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });
