// Scaffolded from blueprint/things/holiday-list/verbs/add-weekly-off.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/holiday-list/add-weekly-off.handler.ts";
import { HolidayList } from "../../blueprint/things/holiday-list/thing.ts";
import { Holiday } from "../../blueprint/things/holiday/thing.ts";
import { oneHolidayPerDay } from "../../blueprint/things/holiday/invariants.ts";

// Days as whole numbers, counted from 1970-01-01 in the proleptic Gregorian calendar, with no clock and no Date: Howard
// Hinnant's days_from_civil and civil_from_days (https://howardhinnant.github.io/date_algorithms.html). A 400-year era
// holds 146097 days, and each year is counted from 1 March so that a leap day falls at its end.
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const dayNumber = (day: string): number => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
};

const dayOf = (n: number): string => {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const d = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yearOfEra + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Every day from `from` to `to`, both ends inside, that falls on `weekday`. 1970-01-01 was a Thursday. */
const daysFalling = (weekday: (typeof weekdays)[number], from: string, to: string): ReadonlyArray<string> => {
  const first = dayNumber(from);
  const last = dayNumber(to);
  const start = first + ((((weekdays.indexOf(weekday) - (first + 4)) % 7) + 7) % 7);
  const days: Array<string> = [];
  for (let n = start; n <= last; n += 7) days.push(dayOf(n));
  return days;
};

/**
 * holiday-list.add-weekly-off: Make every given weekday in a holiday list a day off.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its holidayList.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/holiday-list/verbs/add-weekly-off.ts:
 *   holidayList  holiday-list.id
 *   weekday      Weekday
 *
 * Answer, from blueprint/things/holiday-list/verbs/add-weekly-off.ts:
 *   holidayList    holiday-list.id
 *   weekday        Weekday
 *   added          HolidayCount
 *   totalHolidays  HolidayCount
 *
 * Refusals:
 *   HolidayDateTaken      exit 41   HD-001  the runtime's: another holiday holds this holiday list and holiday date (holiday.oneHolidayPerDay); from blueprint/things/holiday/invariants.ts
 *   HolidayListNameTaken  exit 43   HL-001  the runtime's: another holiday list holds this company and holiday list name (holiday-list.oneNamePerCompany); from blueprint/things/holiday-list/invariants.ts
 *   HolidayListNotActive  exit 40   HL-900  the runtime's, when the holiday-list isn't in active, carrying state; from blueprint/things/holiday-list/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its holidayList.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/holiday-list/verbs/add-weekly-off.ts
 *
 * Idempotent by request, from blueprint/things/holiday-list/verbs/add-weekly-off.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/holiday-list/verbs/add-weekly-off.ts: p95 300ms.
 *
 * The holiday-list's machine, from blueprint/things/holiday-list/machine.ts (▶ marks this call):
 *     from       move          to      emits
 *     (creates)  create        active  HolidayListCreated
 *   ▶ active     addWeeklyOff  active  WeeklyOffAdded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its holidayList.company;
 *   before it runs, it refuses HolidayListNotActive unless the holiday-list is in active;
 *   before it runs, it hands in the holiday-list it read as subject, so this handler never reads it again;
 *   each step is its own span: holiday-list.add-weekly-off.load, holiday-list.add-weekly-off.record;
 *   once it answers, it sets the holiday-list's state to active;
 *   once it answers, it writes WeeklyOffAdded: holidayList, weekday, added and totalHolidays from the answer;
 *   the call is the span holiday-list.add-weekly-off, and its commit holiday-list.add-weekly-off.commit.
 */
const addWeeklyOff: Handler = ({ holidayList, weekday }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span holiday-list.add-weekly-off.load. The runtime read the list for its role and state
    // checks and hands it in; this step finds which of the weekday's days the list already holds.
    const { list, days } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`holiday list ${holidayList} was checked and then not found`));
        const all = daysFalling(weekday, subject["fromDate"] as string, subject["toDate"] as string);
        const held = yield* Effect.forEach(all, (day) => records.findBy(oneHolidayPerDay, { holidayList, holidayDate: day as never }));
        return { list: subject, days: all.filter((_, i) => held[i] === undefined) };
      }),
    );

    // Step record: database, in the store holiday-list, holiday, span holiday-list.add-weekly-off.record. Each new day
    // is a holiday named after its weekday, as ERPNext's get_weekly_off_dates names them, and the list's count follows.
    const added = BigInt(days.length);
    const totalHolidays = (list["totalHolidays"] as bigint) + added;
    yield* steps.record(
      Effect.gen(function* () {
        for (const day of days) {
          const id = yield* Ids.of(Holiday.fields.id);
          yield* records.insert(Holiday, { id, holidayList, holidayDate: day as never, description: weekday }, "active");
        }
        yield* records.update(HolidayList, holidayList, { totalHolidays });
      }),
    );

    // The move addWeeklyOff, from active, to active.
    yield* move();

    return { holidayList, weekday, added, totalHolidays };
  });

export default addWeeklyOff;
