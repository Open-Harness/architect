import { Blueprint } from "orthograph";
import { AppraisalTemplate } from "./thing.ts";
import { TemplateTitleTaken } from "./errors.ts";

// HRMS names a template by its title; here within its company.
export const oneTitlePerCompany = Blueprint.invariant.unique([AppraisalTemplate.fields.company, AppraisalTemplate.fields.title], {
  refuse: TemplateTitleTaken,
});
