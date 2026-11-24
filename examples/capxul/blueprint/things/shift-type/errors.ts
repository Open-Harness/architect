import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class ShiftTypeNameTaken extends Blueprint.error({ shiftTypeName: Name }, { exit: 41 }) {}
/**
 * HRMS's `validate_same_start_and_end`: "Start time and end time cannot be same." An end before the start is a shift
 * that runs past midnight, which HRMS allows. Its other check, `validate_circular_shift`, refuses a shift of 24 hours or
 * more with its check-in buffers, which come with check-ins; without them, every shift whose times differ is shorter.
 */
export class ShiftStartsWhenItEnds extends Blueprint.error({}, { exit: 42 }) {}
