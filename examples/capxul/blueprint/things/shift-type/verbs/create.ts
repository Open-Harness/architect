import { Blueprint } from "orthograph";
import { ShiftType } from "../thing.ts";
import { machine } from "../machine.ts";
import { ShiftStartsWhenItEnds } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// ShiftTypeNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(ShiftType, {
  description: "Add a working shift to a company, from its start time to its end time.",
  payload: {
    company: ShiftType.fields.company,
    shiftTypeName: ShiftType.fields.shiftTypeName,
    startTime: ShiftType.fields.startTime,
    endTime: ShiftType.fields.endTime,
  },
  answer: { shiftType: ShiftType.fields.id },
  move: machine.moves.create,
  errors: [ShiftStartsWhenItEnds],
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
