import { Blueprint } from "orthograph";
import { Designation } from "./thing.ts";

export const DesignationCreated = Blueprint.event({ designation: Designation.fields.id, company: Designation.fields.company });
