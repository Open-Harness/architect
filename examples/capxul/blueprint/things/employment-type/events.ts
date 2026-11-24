import { Blueprint } from "orthograph";
import { EmploymentType } from "./thing.ts";

export const EmploymentTypeCreated = Blueprint.event({ employmentType: EmploymentType.fields.id, company: EmploymentType.fields.company });
