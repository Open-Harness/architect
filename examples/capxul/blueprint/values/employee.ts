import { Blueprint } from "orthograph";
import { DateTime, Option, Schema } from "effect";

/** Whether `YYYY-MM-DD` names a day the calendar has: 2026-02-31 and 2025-02-29 don't. */
const isRealDay = (text: string): boolean => {
  const parsed = DateTime.make(`${text}T00:00:00.000Z`);
  return Option.isSome(parsed) && DateTime.formatIso(parsed.value).slice(0, 10) === text;
};

/**
 * A calendar day, `YYYY-MM-DD`, with no time (ERPNext's Date: `date_of_birth`, `date_of_joining`, `relieving_date`).
 * Held as text until Orthograph has a day value (#742, item 5); written this way, two days compare as text.
 */
export const Day = Blueprint.value(
  Schema.String.check(
    Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
    Schema.makeFilter(isRealDay, { description: "a day that exists in the calendar" }),
  ),
);
/** A gender, by its name in ERPNext's Gender list (Male, Female, Non-Conforming, Prefer not to say, …). */
export const Gender = Blueprint.value(Blueprint.text({ max: 60 }));
