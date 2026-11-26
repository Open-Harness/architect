import { Blueprint } from "orthograph";
import { Holiday } from "./thing.ts";

export const HolidayAdded = Blueprint.event({
  holiday: Holiday.fields.id,
  holidayList: Holiday.fields.holidayList,
  holidayDate: Holiday.fields.holidayDate,
});
