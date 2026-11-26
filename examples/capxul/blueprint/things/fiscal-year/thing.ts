import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Day } from "../../values/employee.ts";
import { YearName } from "../../values/ledger.ts";

// ERPNext's Fiscal Year (erpnext/accounts/doctype/fiscal_year): its name, its first and last days, and whether it is a
// short year. ERPNext keeps a year for the whole site and lists the companies it applies to (Fiscal Year Company);
// Capxul's companies are separate organisations (K42, call 10), so each keeps its own years (`decisions/CX-ledger.md`).
// `disabled` and `auto_created` come with closing the year.
export const FiscalYear = Blueprint.thing({
  description: "A company's accounting year: the days its books are kept for.",
  code: "FY",
  fields: {
    id: Blueprint.id("fyr"),
    company: Company.fields.id,
    year: YearName,
    yearStartDate: Day,
    yearEndDate: Day,
    isShortYear: Blueprint.described(Blueprint.bool(), "A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`)."),
  },
});
