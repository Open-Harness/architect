// Scaffolded from blueprint/things/fiscal-year/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/fiscal-year/create.handler.ts";

const { FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps } = Errors.declared;

/**
 * fiscal-year.create: Set up a company's fiscal year.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/fiscal-year/verbs/create.ts:
 *   company        fiscal-year.company
 *   year           fiscal-year.year
 *   yearStartDate  fiscal-year.yearStartDate
 *   yearEndDate    fiscal-year.yearEndDate
 *   isShortYear    fiscal-year.isShortYear
 *
 * Answer, from blueprint/things/fiscal-year/verbs/create.ts:
 *   fiscalYear  fiscal-year.id
 *
 * Refusals:
 *   FiscalYearEndsBeforeStart  exit 41   FY-001  yours to refuse below, carrying yearStartDate; from blueprint/things/fiscal-year/errors.ts
 *   FiscalYearWrongLength      exit 42   FY-002  yours to refuse below, carrying yearEndDate; from blueprint/things/fiscal-year/errors.ts
 *   FiscalYearOverlaps         exit 43   FY-003  yours to refuse below, carrying fiscalYear; from blueprint/things/fiscal-year/errors.ts
 *   FiscalYearNameTaken        exit 44   FY-004  the runtime's: another fiscal year holds this company and year (fiscal-year.oneNamePerCompany); from blueprint/things/fiscal-year/invariants.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/fiscal-year/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/fiscal-year/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/fiscal-year/verbs/create.ts: p95 150ms.
 *
 * The fiscal-year's machine, from blueprint/things/fiscal-year/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  FiscalYearCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the fiscal-year's new id and hands it in as id;
 *   each step is its own span: fiscal-year.create.load, fiscal-year.create.insert;
 *   once it answers, it sets the fiscal-year's state to active;
 *   once it answers, it writes FiscalYearCreated: fiscalYear from the answer, company, yearStartDate and yearEndDate from the payload;
 *   the call is the span fiscal-year.create, and its commit fiscal-year.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span fiscal-year.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // FiscalYearEndsBeforeStart: exit 41, FY-001.
    if (yield* Handlers.blank<boolean>("refuse FiscalYearEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FiscalYearEndsBeforeStart was refused"));
      return yield* new FiscalYearEndsBeforeStart({
        yearStartDate: yield* Handlers.blank("FiscalYearEndsBeforeStart.yearStartDate, a Day"),
      });
    }

    // FiscalYearWrongLength: exit 42, FY-002.
    if (yield* Handlers.blank<boolean>("refuse FiscalYearWrongLength when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FiscalYearWrongLength was refused"));
      return yield* new FiscalYearWrongLength({
        yearEndDate: yield* Handlers.blank("FiscalYearWrongLength.yearEndDate, a Day"),
      });
    }

    // FiscalYearOverlaps: exit 43, FY-003.
    if (yield* Handlers.blank<boolean>("refuse FiscalYearOverlaps when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FiscalYearOverlaps was refused"));
      return yield* new FiscalYearOverlaps({
        fiscalYear: yield* Handlers.blank("FiscalYearOverlaps.fiscalYear, a fiscal-year.id"),
      });
    }

    // Step insert: database, span fiscal-year.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // FiscalYearCreated needs fiscalYear, and only the answer can give it.
      fiscalYear: id,
    };
  });

export default create;
