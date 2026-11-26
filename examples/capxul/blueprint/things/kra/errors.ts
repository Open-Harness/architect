import { Blueprint } from "orthograph";
import { KraTitle } from "../../values/appraisals.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** HRMS names a KRA by its title (`autoname: field:title`), so a company has one KRA of each title. */
export class KraTitleTaken extends Blueprint.error({ title: KraTitle }, { exit: 41 }) {}
