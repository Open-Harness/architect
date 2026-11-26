import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When both apply, `customer.create` refuses CustomerGroupNotInCompany, then CustomerGroupIsGroup.
/** The customer group belongs to another company. Capxul's own: ERPNext's groups are site-wide. Judged first, as for Account. */
export class CustomerGroupNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** ERPNext's `validate_customer_group`: "Cannot select a Group type Customer Group. Please select a non-group Customer Group." */
export class CustomerGroupIsGroup extends Blueprint.error({}, { exit: 42 }) {}
