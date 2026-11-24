import { Blueprint } from "orthograph";
import { ShiftType } from "./thing.ts";

export const ShiftTypeCreated = Blueprint.event({ shiftType: ShiftType.fields.id, company: ShiftType.fields.company });
