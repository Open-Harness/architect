import { Blueprint } from "orthograph";
import { Designation } from "./thing.ts";
import { DesignationNameTaken } from "./errors.ts";

// ERPNext names a designation by its name, so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([Designation.fields.company, Designation.fields.designationName], {
  refuse: DesignationNameTaken,
});
