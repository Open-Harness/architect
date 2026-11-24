import { Blueprint } from "orthograph";
import { Holiday } from "../thing.ts";
import { machine } from "../machine.ts";
import { HolidayOutsideList } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { HolidayList } from "../../holiday-list/thing.ts";
import { HolidayCount } from "../../../values/holidays.ts";

// HolidayDateTaken belongs to the rule in ../invariants.ts, and the runtime refuses it. Adding a holiday raises its
// list's count, as ERPNext's `total_holidays` follows its table.
export default Blueprint.operation(Holiday, {
  description: "Add one day off to a holiday list.",
  payload: { holidayList: Holiday.fields.holidayList, holidayDate: Holiday.fields.holidayDate, description: Holiday.fields.description },
  answer: { holiday: Holiday.fields.id, totalHolidays: HolidayCount },
  move: machine.moves.add,
  errors: [HolidayOutsideList],
  allowed: [owner.of("holidayList.company")],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database({ writes: [Holiday, HolidayList] }) },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
