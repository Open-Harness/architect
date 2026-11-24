import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class EmployeeGradeNameTaken extends Blueprint.error({ gradeName: Name }, { exit: 41 }) {}
