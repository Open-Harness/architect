import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { AccountHasChildren } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// ERPNext's `convert_group_to_ledger`: refused while any account sits under it. Its other refusal, ledger lines on the
// account, can't happen here: a group takes no lines, and nothing turns a ledger into a group yet.
export default Blueprint.operation(Account, {
  description: "Turn a group account with nothing under it into a ledger.",
  payload: { account: Account.fields.id },
  answer: { account: Account.fields.id },
  move: machine.moves.makeLedger,
  errors: [AccountHasChildren],
  allowed: [owner.of("account.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
