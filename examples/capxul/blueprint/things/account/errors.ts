import { Blueprint } from "orthograph";
import { RootType } from "../../values/ledger.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `account.create` refuses ParentAccountNotInCompany, then ParentAccountIsLedger, then
// RootAccountIsLedger, then RootTypeMissing, then RootTypeNotParents; AccountNameTaken belongs to the rule in
// ./invariants.ts, and the runtime refuses it after these.
/**
 * The parent account belongs to another company (ERPNext's `validate_parent`). Capxul judges it before the parent's
 * group, which ERPNext checks first, so a refusal never tells anything about another company's account.
 */
export class ParentAccountNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** ERPNext's `validate_parent`: "Parent account can not be a ledger". */
export class ParentAccountIsLedger extends Blueprint.error({}, { exit: 42 }) {}
/** ERPNext's `validate_root_details`: "The root account must be a group". */
export class RootAccountIsLedger extends Blueprint.error({}, { exit: 43 }) {}
/** ERPNext's `validate_mandatory`: "Root Type is mandatory". Only a root account names its own. */
export class RootTypeMissing extends Blueprint.error({}, { exit: 44 }) {}
/**
 * The root type given isn't the parent's, which it carries. ERPNext's `set_root_and_report_type` overwrites a child's
 * with its parent's, and its form keeps the field read-only; here a caller that names another is refused instead
 * (`decisions/CX-ledger.md`).
 */
export class RootTypeNotParents extends Blueprint.error({ rootType: RootType }, { exit: 45 }) {}
/** ERPNext's `convert_group_to_ledger`: "Account with child nodes cannot be converted to ledger". */
export class AccountHasChildren extends Blueprint.error({}, { exit: 46 }) {}
/** ERPNext names an account `<name> - <abbr>`, so a company has one of each name. */
export class AccountNameTaken extends Blueprint.error({}, { exit: 47 }) {}
