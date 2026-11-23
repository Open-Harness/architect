import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

// ERPNext names a company by its name, so two companies never share one; their abbreviations are unique too.
export const oneName = Blueprint.invariant.unique(Company.fields.companyName);
export const oneAbbr = Blueprint.invariant.unique(Company.fields.abbr);
