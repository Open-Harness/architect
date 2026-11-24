import { Blueprint } from "orthograph";
import { Holiday } from "./thing.ts";
import { HolidayDateTaken } from "./errors.ts";

// ERPNext's `validate_duplicate_date`: a list holds each day once.
export const oneHolidayPerDay = Blueprint.invariant.unique([Holiday.fields.holidayList, Holiday.fields.holidayDate], {
  refuse: HolidayDateTaken,
});
