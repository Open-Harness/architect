import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** ERPNext: "Holiday Date {0} added multiple times". */
export class HolidayDateTaken extends Blueprint.error({ holidayDate: Day }, { exit: 41 }) {}
/** ERPNext: "The holiday on {0} is not between From Date and To Date". Both ends are inside. */
export class HolidayOutsideList extends Blueprint.error({ fromDate: Day, toDate: Day }, { exit: 42 }) {}
