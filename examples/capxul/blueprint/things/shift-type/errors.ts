import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class ShiftTypeNameTaken extends Blueprint.error({ shiftTypeName: Name }, { exit: 41 }) {}
/**
 * HRMS's `validate_same_start_and_end`: "Start time and end time cannot be same." An end before the start is a shift
 * that runs past midnight, which HRMS allows. Its other check, `validate_circular_shift`, adds the check-in buffers
 * (an hour before the start and an hour after the end by default) and refuses 24 hours or more, so HRMS at its defaults
 * refuses a shift of 22 hours or more. The buffers come with check-ins, and that check with them; no journey pins it.
 */
export class ShiftStartsWhenItEnds extends Blueprint.error({}, { exit: 42 }) {}
