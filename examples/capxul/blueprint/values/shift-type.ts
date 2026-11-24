import { Blueprint } from "orthograph";
import { Schema } from "effect";

/**
 * A time of day, `HH:MM` on a 24-hour clock, with no day and no zone (HRMS's Time: `start_time`, `end_time`). Frappe
 * keeps seconds too; a shift starts on the minute here. Two times compare as text.
 */
export const TimeOfDay = Blueprint.value(Schema.String.check(Schema.isPattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)));
