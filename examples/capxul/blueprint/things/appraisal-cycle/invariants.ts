import { Blueprint } from "orthograph";
import { AppraisalCycle } from "./thing.ts";
import { CycleNameTaken } from "./errors.ts";

// HRMS names a cycle by its name; here within its company.
export const oneNamePerCompany = Blueprint.invariant.unique([AppraisalCycle.fields.company, AppraisalCycle.fields.cycleName], {
  refuse: CycleNameTaken,
});
