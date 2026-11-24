// Scaffolded from blueprint/things/holiday-list/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/holiday-list/create.handler.ts";

const { HolidayListEndsBeforeStart } = Errors.declared;

/**
 * holiday-list.create: Start a company's list of days off, between two days.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/holiday-list/verbs/create.ts:
 *   company          holiday-list.company
 *   holidayListName  holiday-list.holidayListName
 *   fromDate         holiday-list.fromDate
 *   toDate           holiday-list.toDate
 *
 * Answer, from blueprint/things/holiday-list/verbs/create.ts:
 *   holidayList  holiday-list.id
 *
 * Refusals:
 *   HolidayListEndsBeforeStart  exit 44   HL-002  yours to refuse below, carrying fromDate; from blueprint/things/holiday-list/errors.ts
 *   HolidayListNameTaken        exit 43   HL-001  the runtime's: another holiday list holds this company and holiday list name (holiday-list.oneNamePerCompany); from blueprint/things/holiday-list/invariants.ts
 *   NotAllowed                  exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict         exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/holiday-list/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/holiday-list/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/holiday-list/verbs/create.ts: p95 150ms.
 *
 * The holiday-list's machine, from blueprint/things/holiday-list/machine.ts (▶ marks this call):
 *     from       move          to      emits
 *   ▶ (creates)  create        active  HolidayListCreated
 *     active     addWeeklyOff  active  WeeklyOffAdded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the holiday-list's new id and hands it in as id;
 *   each step is its own span: holiday-list.create.insert;
 *   once it answers, it sets the holiday-list's state to active;
 *   once it answers, it writes HolidayListCreated: holidayList from the answer, company from the payload;
 *   the call is the span holiday-list.create, and its commit holiday-list.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // HolidayListEndsBeforeStart: exit 44, HL-002.
    if (yield* Handlers.blank<boolean>("refuse HolidayListEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HolidayListEndsBeforeStart was refused"));
      return yield* new HolidayListEndsBeforeStart({
        fromDate: yield* Handlers.blank("HolidayListEndsBeforeStart.fromDate, a Day"),
      });
    }

    // Step insert: database, span holiday-list.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // HolidayListCreated needs holidayList, and only the answer can give it.
      holidayList: id,
    };
  });

export default create;
