import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";

/** The employee themselves (ERPNext's Employee role, through `user_id`). */
export const self = Blueprint.role(Employee, { rule: (employee, caller) => employee.person === caller.person });
