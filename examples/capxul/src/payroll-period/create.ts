// Scaffolded from blueprint/things/payroll-period/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { PayrollPeriod } from "../../blueprint/things/payroll-period/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payroll-period/create.handler.ts";

const { PayrollPeriodEndsBeforeStart, PayrollPeriodOverlaps } = Errors.declared;

/**
 * payroll-period.create: Set up a company's payroll period.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payroll-period/verbs/create.ts:
 *   company            payroll-period.company
 *   payrollPeriodName  payroll-period.payrollPeriodName
 *   startDate          payroll-period.startDate
 *   endDate            payroll-period.endDate
 *
 * Answer, from blueprint/things/payroll-period/verbs/create.ts:
 *   payrollPeriod  payroll-period.id
 *
 * Refusals:
 *   PayrollPeriodEndsBeforeStart  exit 41   PP-001  yours to refuse below, carrying startDate; from blueprint/things/payroll-period/errors.ts
 *   PayrollPeriodOverlaps         exit 42   PP-002  yours to refuse below, carrying payrollPeriod; from blueprint/things/payroll-period/errors.ts
 *   PayrollPeriodNameTaken        exit 43   PP-003  the runtime's: another payroll period holds this company and payroll period name (payroll-period.oneNamePerCompany); from blueprint/things/payroll-period/invariants.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payroll-period/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/payroll-period/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payroll-period/verbs/create.ts: p95 150ms.
 *
 * The payroll-period's machine, from blueprint/things/payroll-period/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  PayrollPeriodCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the payroll-period's new id and hands it in as id;
 *   each step is its own span: payroll-period.create.load, payroll-period.create.insert;
 *   once it answers, it sets the payroll-period's state to active;
 *   once it answers, it writes PayrollPeriodCreated: payrollPeriod from the answer, company, startDate and endDate from the payload;
 *   the call is the span payroll-period.create, and its commit payroll-period.create.commit.
 */
const create: Handler = ({ company, payrollPeriodName, startDate, endDate }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Every matching row counts as read at commit; the limit is set so the page holds them all.
    const all = { state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

    // Step load: database, span payroll-period.create.load. The company's own periods.
    const periods = yield* steps.load(records.list({ ...all, thing: PayrollPeriod, where: { company } }));

    // Refusal order (errors.ts): the days, then an overlap; the runtime judges the name after these.
    // PayrollPeriodEndsBeforeStart: exit 41, PP-001. A one-day period is allowed.
    if (endDate < startDate) {
      yield* Effect.logInfo(`the period ends on ${endDate}, before it starts on ${startDate}`);
      return yield* new PayrollPeriodEndsBeforeStart({ startDate });
    }

    // PayrollPeriodOverlaps: exit 42, PP-002. Sharing a day, both ends counted; the earliest-starting one is named.
    const overlapping = periods.items
      .filter((p) => (p["startDate"] as string) <= endDate && startDate <= (p["endDate"] as string))
      .sort((a, b) => ((a["startDate"] as string) < (b["startDate"] as string) ? -1 : (a["startDate"] as string) > (b["startDate"] as string) ? 1 : 0));
    const first = overlapping[0];
    if (first) {
      yield* Effect.logInfo(`the period shares days with ${first["id"]}, from ${first["startDate"]} to ${first["endDate"]}`);
      return yield* new PayrollPeriodOverlaps({ payrollPeriod: first["id"] as never });
    }

    // Step insert: database, span payroll-period.create.insert.
    yield* steps.insert(records.insert(PayrollPeriod, { id, company, payrollPeriodName, startDate, endDate }));

    // The move create, to active.
    yield* move();

    return {
      // PayrollPeriodCreated needs payrollPeriod, and only the answer can give it.
      payrollPeriod: id,
    };
  });

export default create;
