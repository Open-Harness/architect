import { Blueprint } from "orthograph";
import { Schema } from "effect";

/** A day of the week, as ERPNext's Holiday List names it in `weekly_off`. */
export const Weekday = Blueprint.value(
  Schema.Literals(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
);
/** How many holidays a list holds (ERPNext's `total_holidays`). */
export const HolidayCount = Blueprint.value(Blueprint.uint(32));
/** What a holiday is for (ERPNext's `description`): a festival's name, or the weekday of a weekly off. */
export const HolidayName = Blueprint.value(Blueprint.text({ max: 140 }));
