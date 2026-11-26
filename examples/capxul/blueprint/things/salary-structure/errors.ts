import { Blueprint } from "orthograph";
import { SalaryComponent } from "../salary-component/thing.ts";
import { Balance } from "../../values/ledger.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// `salary-structure.create` judges in this order: StructureWithoutEarnings; then, line by line over the earnings and
// then the deductions, StructureComponentNotInCompany and StructureComponentWrongType; then, over every line in the same
// order, StructureLineWithoutAmount; then StructureComponentRepeated. Each line refusal carries the component of the
// first line that breaks it. SalaryStructureNameTaken belongs to the rule in ./invariants.ts, and the runtime refuses it
// after these. HRMS's own Salary Structure checks (`validate`) are all on formulas, benefits, timesheets, payment days
// and tax, which are left out; these are Capxul's own (`decisions/CX-payroll.md`).
/** No earning line. Capxul's own: a structure that pays nothing can't make a slip worth posting. */
export class StructureWithoutEarnings extends Blueprint.error({}, { exit: 41 }) {}
/** A line names another company's component. Capxul's own: HRMS's components are the site's. */
export class StructureComponentNotInCompany extends Blueprint.error({ salaryComponent: SalaryComponent.fields.id }, { exit: 42 }) {}
/**
 * A deduction among the earnings, or an earning among the deductions. Capxul's own: HRMS's form offers only components
 * of the table's type, and its server judges nothing.
 */
export class StructureComponentWrongType extends Blueprint.error({ salaryComponent: SalaryComponent.fields.id }, { exit: 43 }) {}
/**
 * A line with no amount whose component has none either. HRMS's `set_missing_values` fills a line with no amount from
 * its component; a line still at 0 pays nothing, and HRMS's slip drops it (`remove_if_zero_valued`). Capxul refuses it.
 */
export class StructureLineWithoutAmount extends Blueprint.error({ salaryComponent: SalaryComponent.fields.id }, { exit: 44 }) {}
/**
 * A component on two lines. Capxul's own: HRMS's slip keeps one row per component and its later line overwrites the
 * earlier (`update_component_row`), so the earlier line would never be paid. It carries the component.
 */
export class StructureComponentRepeated extends Blueprint.error({ salaryComponent: SalaryComponent.fields.id }, { exit: 45 }) {}
/**
 * More deductions than earnings. HRMS refuses a slip with net pay below 0 when it is submitted ("Net Pay cannot be less
 * than 0"), and its payroll entry leaves such slips unsubmitted; with no formulas, a slip pays its structure's lines
 * as they are, so Capxul refuses the structure when it is submitted instead. It carries the net pay.
 */
export class StructureNetPayNegative extends Blueprint.error({ netPay: Balance }, { exit: 46 }) {}
/**
 * The structure is in use: a submitted assignment names it, or a salary slip was made from it. Frappe refuses to cancel
 * a document a submitted one links to (`check_no_back_links_exist`); Capxul counts a draft slip too, since its payroll
 * entry submits it later (`decisions/CX-payroll.md`).
 */
export class StructureInUse extends Blueprint.error({}, { exit: 47 }) {}
/** HRMS names a structure by prompt, unique across the site; here across one company (K42, call 10). */
export class SalaryStructureNameTaken extends Blueprint.error({}, { exit: 48 }) {}
