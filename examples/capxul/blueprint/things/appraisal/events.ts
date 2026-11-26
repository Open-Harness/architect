import { Blueprint } from "orthograph";
import { Appraisal } from "./thing.ts";

export const AppraisalCreated = Blueprint.event({ appraisal: Appraisal.fields.id, employee: Appraisal.fields.employee, appraisalCycle: Appraisal.fields.appraisalCycle });
export const AppraisalRated = Blueprint.event({ appraisal: Appraisal.fields.id });
export const AppraisalSelfRated = Blueprint.event({ appraisal: Appraisal.fields.id });
export const AppraisalSubmitted = Blueprint.event({ appraisal: Appraisal.fields.id });
