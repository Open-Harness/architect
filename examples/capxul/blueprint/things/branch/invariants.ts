import { Blueprint } from "orthograph";
import { Branch } from "./thing.ts";
import { BranchNameTaken } from "./errors.ts";

// ERPNext names a branch by its name, so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([Branch.fields.company, Branch.fields.branchName], {
  refuse: BranchNameTaken,
});
