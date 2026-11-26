import { Blueprint } from "orthograph";
import { CostCenter } from "./thing.ts";
import { CostCenterNameTaken } from "./errors.ts";

// ERPNext's `autoname`: `<cost_center_name> - <company abbr>`, so one company has one of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([CostCenter.fields.company, CostCenter.fields.costCenterName], {
  refuse: CostCenterNameTaken,
});
