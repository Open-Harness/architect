import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
export class HolidayListNameTaken extends Blueprint.error({ holidayListName: Name }, { exit: 43 }) {}
/** ERPNext: "To Date cannot be before From Date". The same day is allowed. */
export class HolidayListEndsBeforeStart extends Blueprint.error({ fromDate: Day }, { exit: 44 }) {}
