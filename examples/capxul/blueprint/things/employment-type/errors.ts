import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class EmploymentTypeNameTaken extends Blueprint.error({ employmentTypeName: Name }, { exit: 41 }) {}
