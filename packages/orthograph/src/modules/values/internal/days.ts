// A calendar day's arithmetic, with no clock and no zone (Dates, #866): a day is counted as whole days from 1970-01-01 in
// the proleptic Gregorian calendar, by Howard Hinnant's `days_from_civil` and `civil_from_days`, so `Date` is never read.
import type { Day, DaysApi } from "../types.ts";

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const isLeap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const lengthOf = (y: number, m: number) => (m === 2 ? (isLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);

/** Year, month and day of `YYYY-MM-DD`, or undefined when the text is no day the calendar has. */
const parts = (text: string): readonly [number, number, number] | undefined => {
  const found = SHAPE.exec(text);
  if (found === null) return undefined;
  const [y, m, d] = [Number(found[1]), Number(found[2]), Number(found[3])];
  return m >= 1 && m <= 12 && d >= 1 && d <= lengthOf(y, m) ? [y, m, d] : undefined;
};

export const isRealDay = (text: string): boolean => parts(text) !== undefined;

/** Days from 1970-01-01. A day a `Blueprint.day()` field holds always parses; anything else counts from year 0. */
const count = (day: Day): number => {
  const [year, m, d] = parts(day) ?? [0, 1, 1];
  const y = m <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
};

const dayOf = (n: number): Day => {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

export const Days: DaysApi = Object.freeze({
  // 1970-01-01 was a Thursday, index 4 from Sunday.
  weekday: (day: Day) => WEEKDAYS[(((count(day) + 4) % 7) + 7) % 7]!,
  add: (day: Day, days: number) => dayOf(count(day) + days),
  between: (from: Day, to: Day) => count(to) - count(from),
});
