import { Blueprint } from "orthograph";
import { Abbr, Country, CurrencyCode, Name } from "../../values/company.ts";

// ERPNext's Company (erpnext/setup/doctype/company), the fields every part of Capxul core reads first. Capxul's
// companies are its own organisations (K42, call 10). `owner` is Capxul's: the person who set the company up.
export const Company = Blueprint.thing({
  description: "A business that keeps its books, people and payroll in Capxul.",
  fields: {
    id: Blueprint.id("com"),
    companyName: Name,
    abbr: Abbr,
    country: Country,
    defaultCurrency: CurrencyCode,
    owner: Blueprint.described(Blueprint.id("per"), "The person who set the company up, and runs it."),
  },
});
