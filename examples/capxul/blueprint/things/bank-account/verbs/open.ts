import { Blueprint } from "orthograph";
import { BankAccount } from "../thing.ts";
import { machine } from "../machine.ts";
import { KybNotApproved } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// BankAccountNameTaken belongs to the rule in ../invariants.ts. The company is the KYB's. Bridge opens the account
// (`POST /v0/customers/{id}/virtual_accounts`, deposits in `currency`, landing as USDC in Capxul's custody); the call to
// it is a step the builder adds once Capxul mounts the Bridge adapter.
export default Blueprint.operation(BankAccount, {
  description: "Open a bank account for a company whose KYB Bridge approved: answers where to send deposits.",
  payload: { business: BankAccount.fields.business, accountName: BankAccount.fields.accountName, currency: BankAccount.fields.currency },
  answer: {
    account: BankAccount.fields.id,
    bankName: BankAccount.fields.bankName,
    accountNumber: BankAccount.fields.accountNumber,
    routingNumber: BankAccount.fields.routingNumber,
  },
  move: machine.moves.open,
  errors: [KybNotApproved],
  allowed: [owner.of("business.company")],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "800 millis" },
});
