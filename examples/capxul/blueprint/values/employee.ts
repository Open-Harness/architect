import { Blueprint } from "orthograph";

/** A calendar day, `YYYY-MM-DD`, with no time (ERPNext's Date: `date_of_birth`, `date_of_joining`, `relieving_date`). Two days compare as text. */
export const Day = Blueprint.value(Blueprint.day());
/** A gender, by its name in ERPNext's Gender list (Male, Female, Non-Conforming, Prefer not to say, …). */
export const Gender = Blueprint.value(Blueprint.text({ max: 60 }));
