import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { machine } from "../machine.ts";
import { Dollars } from "../../../values/bridge.ts";

// AlreadyRecorded belongs to the rule in ../invariants.ts. Bridge's report that a deposit to a company's virtual
// account reached the company's Safe as USDC (`virtual_account.activity`, type `payment_processed`; CX-bridge-rails
// adds the chain's confirmation before it counts). Until #995 brings Bridge's webhook door to an operation, the system
// makes the report (journeys/README.md, "Who speaks for Bridge"); the door's event then takes its place with the same
// fields. The company is the account's.
export default Blueprint.operation(BankTransaction, {
  description: "Record a deposit Bridge landed on a company's bank account.",
  payload: {
    account: BankTransaction.fields.account,
    reference: BankTransaction.fields.reference,
    amount: Blueprint.described(Dollars, "What landed, as Bridge writes it: dollars, at most six places."),
    party: BankTransaction.fields.party,
    date: BankTransaction.fields.date,
  },
  answer: { transaction: BankTransaction.fields.id },
  move: machine.moves.land,
  allowed: [Blueprint.system],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
