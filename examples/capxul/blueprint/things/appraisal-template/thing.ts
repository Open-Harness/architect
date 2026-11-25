import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { TemplateTitle } from "../../values/appraisals.ts";
import { TemplateCriteria, TemplateKras } from "../../values/appraisal-lines.ts";

// HRMS's Appraisal Template (hrms/hr/doctype/appraisal_template): its title, its KRA lines (Appraisal Template Goal) and
// its rating criteria (Employee Feedback Rating). HRMS's templates are site-wide; Capxul's are each company's, unique by
// title in it (`decisions/CX-appraisals.md`). Its description comes with optional fields.
export const AppraisalTemplate = Blueprint.thing({
  description: "The KRAs and criteria a company appraises a kind of job by, each with its share.",
  code: "TP",
  fields: { id: Blueprint.id("apt"), company: Company.fields.id, title: TemplateTitle, kras: TemplateKras, criteria: TemplateCriteria },
});
