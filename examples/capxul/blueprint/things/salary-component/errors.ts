import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `salary-component.create` refuses ComponentAccountNotInCompany, then ComponentAccountIsGroup;
// SalaryComponentTaken belongs to the rule in ./invariants.ts, and the runtime refuses it after these.
/**
 * The account belongs to another company. HRMS's Salary Component Account names the company beside the account, and
 * the account's own `validate_account_head` at posting refuses another company's; Capxul judges it when the component
 * is made.
 */
export class ComponentAccountNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * The account is a group. HRMS's form offers only ledgers, and the accrual entry's `validate_account_head` refuses a
 * group; Capxul judges it when the component is made.
 */
export class ComponentAccountIsGroup extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS names a component by its name (`autoname: field:salary_component`), so a company has one of each name. */
export class SalaryComponentTaken extends Blueprint.error({}, { exit: 43 }) {}
