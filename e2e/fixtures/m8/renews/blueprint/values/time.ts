import { Blueprint } from "orthograph";

/** A moment, stored as a UTC instant and written as ISO 8601 with milliseconds: "2027-01-10T09:00:00.000Z" (M8-checks). */
export const Instant = Blueprint.value(Blueprint.instant());
