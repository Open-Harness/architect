import { Blueprint } from "orthograph";
import { TemplateTitle, Weightage } from "../../values/appraisals.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `appraisal-template.create` refuses TemplateWithoutKras, then TemplateKraNotInCompany, then
// TemplateCriteriaNotInCompany, then TemplateLineRepeated, then TemplateWeightageOutOfRange, then
// KraWeightageNotHundred, then CriteriaWeightageNotHundred (HRMS's `validate`: the KRAs' total before the criteria's);
// TemplateTitleTaken is the rule's, refused at commit.
/** HRMS's `goals` table is required: a template has at least one KRA line. */
export class TemplateWithoutKras extends Blueprint.error({}, { exit: 41 }) {}
/** Capxul's own rule: each KRA is the company's. HRMS's KRAs are site-wide. A KRA that doesn't exist is refused the same way. */
export class TemplateKraNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own rule: each criteria is the company's. A criteria that doesn't exist is refused the same way. */
export class TemplateCriteriaNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** Capxul's own rule: a KRA, or a criteria, appears once. HRMS's tables allow a repeat, which would count a KRA's goals twice. */
export class TemplateLineRepeated extends Blueprint.error({}, { exit: 44 }) {}
/** Capxul's own rule: each line's weightage is more than 0 and at most 100. HRMS's Percent field has no bound. */
export class TemplateWeightageOutOfRange extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's `validate_total_weightage("goals", "KRAs")`: the KRAs' weightages total exactly 100. It carries the total. */
export class KraWeightageNotHundred extends Blueprint.error({ total: Weightage }, { exit: 46 }) {}
/** HRMS's `validate_total_weightage("rating_criteria", "Criteria")`: criteria, when there are any, total exactly 100. It carries the total. */
export class CriteriaWeightageNotHundred extends Blueprint.error({ total: Weightage }, { exit: 47 }) {}
/** HRMS names a template by its title (`autoname: field:template_title`), so a company has one of each title. */
export class TemplateTitleTaken extends Blueprint.error({ title: TemplateTitle }, { exit: 48 }) {}
