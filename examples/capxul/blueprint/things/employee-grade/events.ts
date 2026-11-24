import { Blueprint } from "orthograph";
import { EmployeeGrade } from "./thing.ts";

export const EmployeeGradeCreated = Blueprint.event({ grade: EmployeeGrade.fields.id, company: EmployeeGrade.fields.company });
