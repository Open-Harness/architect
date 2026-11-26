// Scaffolded from blueprint/things/payroll-period/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
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
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span payroll-period.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // PayrollPeriodEndsBeforeStart: exit 41, PP-001.
    if (yield* Handlers.blank<boolean>("refuse PayrollPeriodEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayrollPeriodEndsBeforeStart was refused"));
      return yield* new PayrollPeriodEndsBeforeStart({
        startDate: yield* Handlers.blank("PayrollPeriodEndsBeforeStart.startDate, a Day"),
      });
    }

    // PayrollPeriodOverlaps: exit 42, PP-002.
    if (yield* Handlers.blank<boolean>("refuse PayrollPeriodOverlaps when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayrollPeriodOverlaps was refused"));
      return yield* new PayrollPeriodOverlaps({
        payrollPeriod: yield* Handlers.blank("PayrollPeriodOverlaps.payrollPeriod, a payroll-period.id"),
      });
    }

    // Step insert: database, span payroll-period.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // PayrollPeriodCreated needs payrollPeriod, and only the answer can give it.
      payrollPeriod: id,
    };
  });

export default create;
