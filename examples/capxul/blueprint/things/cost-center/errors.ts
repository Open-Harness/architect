import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `cost-center.create` refuses ParentCostCenterNotInCompany, then ParentCostCenterIsLedger, then
// RootCostCenterIsLedger; CostCenterNameTaken belongs to the rule in ./invariants.ts, and the runtime refuses it after.
/** The parent cost center belongs to another company. Capxul's own refusal: ERPNext's `validate_parent_cost_center` doesn't look. */
export class ParentCostCenterNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** ERPNext's `validate_parent_cost_center`: "is not a group node. Please select a group node as parent cost center". */
export class ParentCostCenterIsLedger extends Blueprint.error({}, { exit: 42 }) {}
/** A cost center with no parent is a root, and a root is a group, as an account's is. Capxul's own, after Account. */
export class RootCostCenterIsLedger extends Blueprint.error({}, { exit: 43 }) {}
/** ERPNext names a cost center `<name> - <abbr>`, so a company has one of each name. */
export class CostCenterNameTaken extends Blueprint.error({}, { exit: 44 }) {}
