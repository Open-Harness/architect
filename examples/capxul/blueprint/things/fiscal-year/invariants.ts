import { Blueprint } from "orthograph";
import { FiscalYear } from "./thing.ts";
import { FiscalYearNameTaken } from "./errors.ts";

// ERPNext names a fiscal year by its `year` across the site; here across one company (K42, call 10).
export const oneNamePerCompany = Blueprint.invariant.unique([FiscalYear.fields.company, FiscalYear.fields.year], {
  refuse: FiscalYearNameTaken,
});
