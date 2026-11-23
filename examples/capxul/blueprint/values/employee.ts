import { Blueprint } from "orthograph";
import { Schema } from "effect";

/**
 * A calendar day, `YYYY-MM-DD`, with no time (ERPNext's Date: `date_of_birth`, `date_of_joining`, `relieving_date`).
 * Held as text until Orthograph has a day value (#742, item 5); written this way, two days compare as text.
 */
export const Day = Blueprint.value(Schema.String.check(Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)));
/** A gender, by its name in ERPNext's Gender list (Male, Female, Non-Conforming, Prefer not to say, …). */
export const Gender = Blueprint.value(Blueprint.text({ max: 60 }));
