import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { ParentAccountIsLedger, ParentAccountNotInCompany, RootAccountIsLedger, RootTypeMissing, RootTypeNotParents } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). A child takes its parent's root type, given or not; a root names its own. The report type
// follows the root type (ERPNext's `set_root_and_report_type`). `isGroup` picks the state it is made in.
export default Blueprint.operation(Account, {
  description: "Add an account to a company's chart, under a group or as a root.",
  payload: {
    company: Account.fields.company,
    accountName: Account.fields.accountName,
    parentAccount: Account.fields.parentAccount,
    isGroup: Blueprint.described(Blueprint.bool(), "Make it a group, which other accounts sit under, rather than a ledger, which takes entries."),
    rootType: Blueprint.optional(Account.fields.rootType),
    accountType: Account.fields.accountType,
  },
  answer: { account: Account.fields.id, rootType: Account.fields.rootType, reportType: Account.fields.reportType },
  move: machine.moves.create,
  errors: [ParentAccountNotInCompany, ParentAccountIsLedger, RootAccountIsLedger, RootTypeMissing, RootTypeNotParents],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
