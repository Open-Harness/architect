import { Blueprint } from "orthograph";
import { SalaryStructure } from "./thing.ts";
import { SalaryStructureNameTaken } from "./errors.ts";

// HRMS names a structure across the site; here across one company (K42, call 10).
export const oneNamePerCompany = Blueprint.invariant.unique([SalaryStructure.fields.company, SalaryStructure.fields.salaryStructureName], {
  refuse: SalaryStructureNameTaken,
});
