import { Blueprint } from "orthograph";
import { CustomerGroup } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `customer-group.create` refuses ParentCustomerGroupNotInCompany, then ParentCustomerGroupIsLedger, then CustomerGroupRootExists;
// CustomerGroupNameTaken belongs to the rule in ./invariants.ts, and the runtime refuses it after these.
/** The parent group belongs to another company. Capxul's own: ERPNext's groups are site-wide. Judged first, as for Account. */
export class ParentCustomerGroupNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * The parent is a ledger. ERPNext's form only offers groups as a parent (the `is_group` filter on
 * `parent_customer_group`); Capxul refuses it on the server, as Account's `validate_parent` does.
 */
export class ParentCustomerGroupIsLedger extends Blueprint.error({}, { exit: 42 }) {}
/**
 * A group with no parent is a root, and the company has one already, which it carries. Frappe's NestedSet
 * `validate_one_root`: "Multiple root nodes not allowed", here per company.
 */
export class CustomerGroupRootExists extends Blueprint.error({ root: CustomerGroup.fields.id }, { exit: 43 }) {}
/** ERPNext names a customer group by `customer_group_name`, which is unique; here unique in its company. */
export class CustomerGroupNameTaken extends Blueprint.error({}, { exit: 44 }) {}
