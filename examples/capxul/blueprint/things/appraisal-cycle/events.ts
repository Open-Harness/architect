import { Blueprint } from "orthograph";
import { AppraisalCycle } from "./thing.ts";

export const AppraisalCycleCreated = Blueprint.event({ appraisalCycle: AppraisalCycle.fields.id, company: AppraisalCycle.fields.company });
export const AppraisalCycleStarted = Blueprint.event({ appraisalCycle: AppraisalCycle.fields.id });
export const AppraisalCycleCompleted = Blueprint.event({ appraisalCycle: AppraisalCycle.fields.id });
export const AppraisalCycleReopened = Blueprint.event({ appraisalCycle: AppraisalCycle.fields.id });
