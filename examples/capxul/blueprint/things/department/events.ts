import { Blueprint } from "orthograph";
import { Department } from "./thing.ts";

export const DepartmentCreated = Blueprint.event({ department: Department.fields.id, company: Department.fields.company });
