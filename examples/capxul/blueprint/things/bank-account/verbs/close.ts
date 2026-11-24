import { Blueprint } from "orthograph";
import { BankAccount } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

export default Blueprint.operation(BankAccount, {
  description: "Close a company's bank account; it takes no more deposits.",
  payload: { account: BankAccount.fields.id },
  answer: { account: BankAccount.fields.id },
  move: machine.moves.close,
  allowed: [owner.of("account.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "800 millis" },
});
