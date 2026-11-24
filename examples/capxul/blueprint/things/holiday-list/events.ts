import { Blueprint } from "orthograph";
import { HolidayList } from "./thing.ts";
import { HolidayCount, Weekday } from "../../values/holidays.ts";

export const HolidayListCreated = Blueprint.event({ holidayList: HolidayList.fields.id, company: HolidayList.fields.company });
export const WeeklyOffAdded = Blueprint.event({
  holidayList: HolidayList.fields.id,
  weekday: Weekday,
  added: HolidayCount,
  totalHolidays: HolidayCount,
});
