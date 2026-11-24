import { Blueprint } from "orthograph";
import { Abbr, Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class CompanyNameTaken extends Blueprint.error({ companyName: Name }, { exit: 41 }) {}
export class CompanyAbbrTaken extends Blueprint.error({ abbr: Abbr }, { exit: 42 }) {}
