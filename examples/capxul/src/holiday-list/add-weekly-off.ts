// Scaffolded from blueprint/things/holiday-list/verbs/add-weekly-off.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/holiday-list/add-weekly-off.handler.ts";

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
const addWeeklyOff: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span holiday-list.add-weekly-off.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // Step record: database, in the store holiday-list, holiday, span holiday-list.add-weekly-off.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move addWeeklyOff, from active, to active.
    yield* move();

    return {
      holidayList: yield* Handlers.blank("holidayList, a holiday-list.id"),
      weekday: yield* Handlers.blank("weekday, a Weekday"),
      // WeeklyOffAdded needs added, and only the answer can give it.
      added: yield* Handlers.blank("added, a HolidayCount"),
      totalHolidays: yield* Handlers.blank("totalHolidays, a HolidayCount"),
    };
  });

export default addWeeklyOff;
