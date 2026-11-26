import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { machine } from "../machine.ts";
import { AccountClosed, CurrencyNotHeld, NothingToSend } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Dollars } from "../../../values/bridge.ts";

// AlreadyRecorded belongs to the rule in ../invariants.ts. Bridge makes the transfer (`POST /v0/transfers`) from the
// company's Safe, which pays Bridge's deposit address for it in USDC on chain (CX-bridge-rails), to the payee's
// external account, with an `Idempotency-Key` made from this call's request key, so a retry makes no second transfer.
// The call is a step the builder adds once #995 lets a step reach the Bridge adapter. Until then the handler records
// the transfer with a reference of its own. The company is the account's.
export default Blueprint.operation(BankTransaction, {
  description: "Send money out of a company's bank account to a payee, through Bridge.",
  payload: {
    account: BankTransaction.fields.account,
    amount: Blueprint.described(Dollars, "What to send, in dollars, at most six places, as Bridge takes it."),
    currency: Blueprint.described(BankTransaction.fields.currency, "The currency the payee is paid in: the account's own."),
    party: Blueprint.described(BankTransaction.fields.party, "The payee: the Bridge external account the money goes to."),
  },
  answer: { transaction: BankTransaction.fields.id, reference: BankTransaction.fields.reference },
  move: machine.moves.send,
  errors: [AccountClosed, CurrencyNotHeld, NothingToSend],
  allowed: [owner.of("account.company")],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "800 millis" },
});
