import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";
import { CompanyAbbrTaken, CompanyNameTaken } from "./errors.ts";

// ERPNext keeps a company's name unique (it names the record) and its abbreviation too (`company.py`,
// `validate_abbr`), across one site, which is one customer. Capxul's companies are separate organisations
// (K42, call 10), so the rules hold among one person's companies: nobody can block another's name, and a refusal
// never tells anyone that someone else's company exists.
export const oneNamePerOwner = Blueprint.invariant.unique([Company.fields.owner, Company.fields.companyName], {
  refuse: CompanyNameTaken,
});
export const oneAbbrPerOwner = Blueprint.invariant.unique([Company.fields.owner, Company.fields.abbr], {
  refuse: CompanyAbbrTaken,
});
