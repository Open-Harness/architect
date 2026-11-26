import { Blueprint } from "orthograph";
import { AppraisalTemplate } from "./thing.ts";

export const AppraisalTemplateCreated = Blueprint.event({ appraisalTemplate: AppraisalTemplate.fields.id, company: AppraisalTemplate.fields.company });
