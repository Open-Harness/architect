// Scaffolded from blueprint/things/fiscal-year/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/fiscal-year/create.handler.ts";
import { FiscalYear } from "../../blueprint/things/fiscal-year/thing.ts";

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
/**
 * The last day of a full year from `start`: the same date a year on, less a day. A year on from 29 February is 28
 * February, as `relativedelta` has it, so a year from a leap day ends on 27 February.
 */
const fullYearEnd = (start: string): string => {
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  const next = y + 1;
  const leap = (next % 4 === 0 && next % 100 !== 0) || next % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return Days.add(`${String(next).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}` as never, -1);
};

const create: Handler = ({ company, year, yearStartDate, yearEndDate, isShortYear }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span fiscal-year.create.load. The company's years, for the overlap check. A list reads
    // every matching row whatever its limit, so one call takes them all.
    const years = yield* steps.load(
      records.list({ thing: FiscalYear, where: { company }, state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined }),
    );

    // Refusal order (errors.ts): FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps. Days are
    // YYYY-MM-DD, so they compare as text.
    // FiscalYearEndsBeforeStart: exit 41, FY-001. A one-day year (end on the start) is allowed.
    if (yearEndDate < yearStartDate) {
      yield* Effect.logInfo("the year ends before it starts");
      return yield* new FiscalYearEndsBeforeStart({ yearStartDate });
    }

    // FiscalYearWrongLength: exit 42, FY-002. A full year ends exactly a year less a day on; a short one no later.
    const shouldEnd = fullYearEnd(yearStartDate) as typeof yearEndDate;
    if (isShortYear ? yearEndDate > shouldEnd : yearEndDate !== shouldEnd) {
      yield* Effect.logInfo(`a ${isShortYear ? "short " : ""}year from ${yearStartDate} ends ${isShortYear ? "no later than" : "on"} ${shouldEnd}`);
      return yield* new FiscalYearWrongLength({ yearEndDate: shouldEnd });
    }

    // FiscalYearOverlaps: exit 43, FY-003. Sharing a day, both ends counted; the earliest-starting year is named.
    const overlapping = years.items
      .filter((other) => (other["yearStartDate"] as string) <= yearEndDate && (other["yearEndDate"] as string) >= yearStartDate)
      .sort((a, b) => ((a["yearStartDate"] as string) < (b["yearStartDate"] as string) ? -1 : 1));
    const first = overlapping[0];
    if (first) {
      yield* Effect.logInfo(`the year shares days with ${String(first["year"])}`);
      return yield* new FiscalYearOverlaps({ fiscalYear: first["id"] as never });
    }

    // Step insert: database, span fiscal-year.create.insert. A name already used is the runtime's refusal
    // (oneNamePerCompany).
    yield* steps.insert(records.insert(FiscalYear, { id, company, year, yearStartDate, yearEndDate, isShortYear }));

    // The move create, to active.
    yield* move();

    return {
      // FiscalYearCreated needs fiscalYear, and only the answer can give it.
      fiscalYear: id,
    };
  });

export default create;
