import { Blueprint } from "orthograph";
import type { Field } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";
import { AccountType, ReportType, RootType } from "../../values/ledger.ts";

// ERPNext's Account (erpnext/accounts/doctype/account), a tree (Frappe's NestedSet, `parent_account`): its name, the
// group it sits under, its root type and report type, and its account type. Whether it is a group or a ledger is its
// state, not a field: the move from group to ledger is ERPNext's `convert_group_to_ledger`.
// Its number, currency (every amount is USDC, CX-grill section 3), freezing, `balance_must_be`, `tax_rate` and
// `disabled` come later (`decisions/CX-ledger.md`).
// The id's value is declared on its own, so the parent link, which points back at this thing, has a type to name.
const AccountId = Blueprint.id("acc");

export const Account = Blueprint.thing({
  description: "A heading in a company's chart of accounts: a group of accounts, or a ledger that takes entries.",
  code: "AC",
  fields: {
    id: AccountId,
    company: Company.fields.id,
    accountName: Name,
    parentAccount: Blueprint.optional(Blueprint.link((): Field<typeof AccountId, "id"> => Account.fields.id)),
    rootType: RootType,
    reportType: ReportType,
    accountType: Blueprint.optional(AccountType),
  },
});
