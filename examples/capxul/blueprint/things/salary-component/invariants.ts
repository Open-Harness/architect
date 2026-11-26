import { Blueprint } from "orthograph";
import { SalaryComponent } from "./thing.ts";
import { SalaryComponentTaken } from "./errors.ts";

// HRMS names a component by its name across the site; here across one company (K42, call 10).
export const oneNamePerCompany = Blueprint.invariant.unique([SalaryComponent.fields.company, SalaryComponent.fields.salaryComponent], {
  refuse: SalaryComponentTaken,
});
