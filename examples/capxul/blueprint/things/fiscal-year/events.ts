import { Blueprint } from "orthograph";
import { FiscalYear } from "./thing.ts";

export const FiscalYearCreated = Blueprint.event({
  fiscalYear: FiscalYear.fields.id,
  company: FiscalYear.fields.company,
  yearStartDate: FiscalYear.fields.yearStartDate,
  yearEndDate: FiscalYear.fields.yearEndDate,
});
