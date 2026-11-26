import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When both apply, `supplier.create` refuses SupplierGroupNotInCompany, then SupplierGroupIsGroup.
/** The supplier group belongs to another company. Capxul's own: ERPNext's groups are site-wide. Judged first, as for Account. */
export class SupplierGroupNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** ERPNext's `validate_supplier_group`: "Cannot select a Group type Supplier Group. Please select a non-group Supplier Group." */
export class SupplierGroupIsGroup extends Blueprint.error({}, { exit: 42 }) {}
