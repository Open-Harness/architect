import { Blueprint } from "orthograph";
import { HolidayList } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { Holiday } from "../../holiday/thing.ts";
import { HolidayCount, Weekday } from "../../../values/holidays.ts";

// ERPNext's `get_weekly_off_dates`: every such weekday from the list's first day to its last becomes a holiday named
// after the weekday. A day the list already holds is skipped, not refused.
export default Blueprint.operation(HolidayList, {
  description: "Make every given weekday in a holiday list a day off.",
  payload: { holidayList: HolidayList.fields.id, weekday: Weekday },
  answer: { holidayList: HolidayList.fields.id, weekday: Weekday, added: HolidayCount, totalHolidays: HolidayCount },
  move: machine.moves.addWeeklyOff,
  allowed: [owner.of("holidayList.company")],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database({ writes: [HolidayList, Holiday] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
