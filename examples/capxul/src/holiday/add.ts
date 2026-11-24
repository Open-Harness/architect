// Scaffolded from blueprint/things/holiday/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/holiday/add.handler.ts";
import { Holiday } from "../../blueprint/things/holiday/thing.ts";
import { HolidayList } from "../../blueprint/things/holiday-list/thing.ts";

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
const add: Handler = ({ holidayList, holidayDate, description }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span holiday.add.load. The runtime read the list and hands it in; that read fixes the version
    // the count's update below is guarded by.
    const list = yield* steps.load(Effect.succeed(refs.holidayList));
    if (!list) return yield* Effect.die(new Error(`holiday list ${holidayList} was read for the role check and then not found`));
    const fromDate = list["fromDate"] as typeof holidayDate;
    const toDate = list["toDate"] as typeof holidayDate;

    // HolidayOutsideList: exit 42, HD-002. Days are YYYY-MM-DD, so they compare as text; both ends are inside.
    if (holidayDate < fromDate || holidayDate > toDate) {
      yield* Effect.logInfo(`${holidayDate} is outside the list's ${fromDate} to ${toDate}`);
      return yield* new HolidayOutsideList({ fromDate, toDate });
    }

    // Step insert: database, span holiday.add.insert. The holiday, and its list's count, which follows its holidays as
    // ERPNext's total_holidays does. A day the list already holds is the runtime's refusal (holiday.oneHolidayPerDay).
    const totalHolidays = (list["totalHolidays"] as bigint) + 1n;
    yield* steps.insert(
      Effect.andThen(
        records.insert(Holiday, { id, holidayList, holidayDate, description }),
        records.update(HolidayList, holidayList, { totalHolidays }),
      ),
    );

    // The move add, to active.
    yield* move();

    return {
      // HolidayAdded needs holiday, and only the answer can give it.
      holiday: id,
      totalHolidays,
    };
  });

export default add;
