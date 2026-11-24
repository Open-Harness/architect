// Scaffolded from blueprint/things/holiday/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/holiday/add.handler.ts";

const { HolidayOutsideList } = Errors.declared;

/**
 * holiday.add: Add one day off to a holiday list.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its holidayList.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/holiday/verbs/add.ts:
 *   holidayList  holiday.holidayList
 *   holidayDate  holiday.holidayDate
 *   description  holiday.description
 *
 * Answer, from blueprint/things/holiday/verbs/add.ts:
 *   holiday        holiday.id
 *   totalHolidays  HolidayCount
 *
 * Refusals:
 *   HolidayOutsideList    exit 42   HD-002  yours to refuse below, carrying fromDate, toDate; from blueprint/things/holiday/errors.ts
 *   HolidayDateTaken      exit 41   HD-001  the runtime's: another holiday holds this holiday list and holiday date (holiday.oneHolidayPerDay); from blueprint/things/holiday/invariants.ts
 *   HolidayListNameTaken  exit 43   HL-001  the runtime's: another holiday list holds this company and holiday list name (holiday-list.oneNamePerCompany); from blueprint/things/holiday-list/invariants.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its holidayList.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/holiday/verbs/add.ts
 *
 * Idempotent by request, from blueprint/things/holiday/verbs/add.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/holiday/verbs/add.ts: p95 200ms.
 *
 * The holiday's machine, from blueprint/things/holiday/machine.ts (▶ marks this call):
 *     from       move  to      emits
 *   ▶ (creates)  add   active  HolidayAdded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its holidayList.company;
 *   before it runs, it reads the holidayList and hands it in as refs.holidayList;
 *   before it runs, it mints the holiday's new id and hands it in as id;
 *   each step is its own span: holiday.add.load, holiday.add.insert;
 *   once it answers, it sets the holiday's state to active;
 *   once it answers, it writes HolidayAdded: holiday from the answer, holidayList and holidayDate from the payload;
 *   the call is the span holiday.add, and its commit holiday.add.commit.
 */
const add: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span holiday.add.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // HolidayOutsideList: exit 42, HD-002.
    if (yield* Handlers.blank<boolean>("refuse HolidayOutsideList when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HolidayOutsideList was refused"));
      return yield* new HolidayOutsideList({
        fromDate: yield* Handlers.blank("HolidayOutsideList.fromDate, a Day"),
        toDate: yield* Handlers.blank("HolidayOutsideList.toDate, a Day"),
      });
    }

    // Step insert: database, in the store holiday, holiday-list, span holiday.add.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move add, to active.
    yield* move();

    return {
      // HolidayAdded needs holiday, and only the answer can give it.
      holiday: id,
      totalHolidays: yield* Handlers.blank("totalHolidays, a HolidayCount"),
    };
  });

export default add;
