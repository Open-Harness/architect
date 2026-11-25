// Scaffolded from blueprint/things/payroll-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payroll-entry/create.handler.ts";

const { PayrollEndsBeforeStart, PayableAccountNotInCompany, PayableAccountIsGroup, PayableAccountHasType, PayrollCostCenterNotInCompany, PayrollCostCenterIsGroup, NoEmployeesFound } = Errors.declared;

/**
 * payroll-entry.create: Draft a payroll entry for a span of days, filled with the company's employees to pay.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payroll-entry/verbs/create.ts:
 *   company                payroll-entry.company
 *   postingDate            payroll-entry.postingDate
 *   startDate              payroll-entry.startDate
 *   endDate                payroll-entry.endDate
 *   costCenter             payroll-entry.costCenter
 *   payrollPayableAccount  payroll-entry.payrollPayableAccount
 *
 * Answer, from blueprint/things/payroll-entry/verbs/create.ts:
 *   payrollEntry       payroll-entry.id
 *   numberOfEmployees  payroll-entry.numberOfEmployees
 *
 * Refusals:
 *   PayrollEndsBeforeStart         exit 41   PE-001  yours to refuse below, carrying startDate; from blueprint/things/payroll-entry/errors.ts
 *   PayableAccountNotInCompany     exit 42   PE-002  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   PayableAccountIsGroup          exit 43   PE-003  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   PayableAccountHasType          exit 44   PE-004  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   PayrollCostCenterNotInCompany  exit 45   PE-005  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   PayrollCostCenterIsGroup       exit 46   PE-006  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   NoEmployeesFound               exit 47   PE-007  yours to refuse below; from blueprint/things/payroll-entry/errors.ts
 *   CostCenterNotFound             exit 4    CC-901  the runtime's, when no cost-center has that id, carrying id; from blueprint/things/cost-center/thing.ts
 *   AccountNotFound                exit 4    AC-901  the runtime's, when no account has that id, carrying id; from blueprint/things/account/thing.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payroll-entry/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/payroll-entry/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payroll-entry/verbs/create.ts: p95 300ms.
 *
 * The payroll-entry's machine, from blueprint/things/payroll-entry/machine.ts (▶ marks this call):
 *     from       move         to         emits
 *   ▶ (creates)  create       draft      PayrollEntryDrafted
 *     draft      submit       submitted  PayrollEntrySubmitted
 *     submitted  submitSlips  accrued    SalarySlipsSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the costCenter and hands it in as refs.costCenter, refusing CostCenterNotFound if there is none;
 *   before it runs, it reads the payrollPayableAccount and hands it in as refs.payrollPayableAccount, refusing AccountNotFound if there is none;
 *   before it runs, it mints the payroll-entry's new id and hands it in as id;
 *   each step is its own span: payroll-entry.create.load, payroll-entry.create.insert;
 *   once it answers, it sets the payroll-entry's state to draft;
 *   once it answers, it writes PayrollEntryDrafted: payrollEntry and numberOfEmployees from the answer, company from the payload;
 *   the call is the span payroll-entry.create, and its commit payroll-entry.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span payroll-entry.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // PayrollEndsBeforeStart: exit 41, PE-001.
    if (yield* Handlers.blank<boolean>("refuse PayrollEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayrollEndsBeforeStart was refused"));
      return yield* new PayrollEndsBeforeStart({
        startDate: yield* Handlers.blank("PayrollEndsBeforeStart.startDate, a Day"),
      });
    }

    // PayableAccountNotInCompany: exit 42, PE-002.
    if (yield* Handlers.blank<boolean>("refuse PayableAccountNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayableAccountNotInCompany was refused"));
      return yield* new PayableAccountNotInCompany({});
    }

    // PayableAccountIsGroup: exit 43, PE-003.
    if (yield* Handlers.blank<boolean>("refuse PayableAccountIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayableAccountIsGroup was refused"));
      return yield* new PayableAccountIsGroup({});
    }

    // PayableAccountHasType: exit 44, PE-004.
    if (yield* Handlers.blank<boolean>("refuse PayableAccountHasType when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayableAccountHasType was refused"));
      return yield* new PayableAccountHasType({});
    }

    // PayrollCostCenterNotInCompany: exit 45, PE-005.
    if (yield* Handlers.blank<boolean>("refuse PayrollCostCenterNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayrollCostCenterNotInCompany was refused"));
      return yield* new PayrollCostCenterNotInCompany({});
    }

    // PayrollCostCenterIsGroup: exit 46, PE-006.
    if (yield* Handlers.blank<boolean>("refuse PayrollCostCenterIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PayrollCostCenterIsGroup was refused"));
      return yield* new PayrollCostCenterIsGroup({});
    }

    // NoEmployeesFound: exit 47, PE-007.
    if (yield* Handlers.blank<boolean>("refuse NoEmployeesFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NoEmployeesFound was refused"));
      return yield* new NoEmployeesFound({});
    }

    // Step insert: database, in the store payroll-entry, payroll-employee-detail, span payroll-entry.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // PayrollEntryDrafted needs payrollEntry, and only the answer can give it.
      payrollEntry: id,
      numberOfEmployees: yield* Handlers.blank("numberOfEmployees, a payroll-entry.numberOfEmployees"),
    };
  });

export default create;
