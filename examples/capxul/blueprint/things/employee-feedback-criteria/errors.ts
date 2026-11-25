import { Blueprint } from "orthograph";
import { CriteriaName } from "../../values/appraisals.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** HRMS names a criteria by itself (`autoname: field:criteria`), so a company has one of each name. */
export class CriteriaNameTaken extends Blueprint.error({ criteria: CriteriaName }, { exit: 41 }) {}
