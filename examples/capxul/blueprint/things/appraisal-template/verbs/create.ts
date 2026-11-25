import { Blueprint } from "orthograph";
import { AppraisalTemplate } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  CriteriaWeightageNotHundred,
  KraWeightageNotHundred,
  TemplateCriteriaNotInCompany,
  TemplateKraNotInCompany,
  TemplateLineRepeated,
  TemplateWeightageOutOfRange,
  TemplateWithoutKras,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). TemplateTitleTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
// The load step reads each line's KRA and criteria, and writes nothing.
export default Blueprint.operation(AppraisalTemplate, {
  description: "Make an appraisal template: KRAs and rating criteria, each with its weightage.",
  payload: {
    company: AppraisalTemplate.fields.company,
    title: AppraisalTemplate.fields.title,
    kras: AppraisalTemplate.fields.kras,
    criteria: AppraisalTemplate.fields.criteria,
  },
  answer: { appraisalTemplate: AppraisalTemplate.fields.id },
  move: machine.moves.create,
  errors: [
    TemplateWithoutKras,
    TemplateKraNotInCompany,
    TemplateCriteriaNotInCompany,
    TemplateLineRepeated,
    TemplateWeightageOutOfRange,
    KraWeightageNotHundred,
    CriteriaWeightageNotHundred,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
