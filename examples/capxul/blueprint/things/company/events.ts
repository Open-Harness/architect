import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

export const CompanyCreated = Blueprint.event({ company: Company.fields.id, owner: Company.fields.owner });
