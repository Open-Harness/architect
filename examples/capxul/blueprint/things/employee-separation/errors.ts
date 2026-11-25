import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// SeparationAlreadyOpen is the rule's, refused at commit, after SeparatedEmployeeNotInCompany.
/** The employee named works for another company. Capxul's own refusal: HRMS copies `company` from the employee (`fetch_from`). */
export class SeparatedEmployeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** Capxul's own rule: one open separation per employee. HRMS has no such check (`decisions/CX-employee-moves.md`). */
export class SeparationAlreadyOpen extends Blueprint.error({}, { exit: 42 }) {}
