// Scaffolded from blueprint/things/payroll-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payroll-entry/submit.handler.ts";

const { SalarySlipExists, NoAssignmentAtStart } = Errors.declared;

/**
 * payroll-entry.submit: Submit a payroll entry, making a draft salary slip for each of its employees.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its payrollEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payroll-entry/verbs/submit.ts:
 *   payrollEntry  payroll-entry.id
 *
 * Answer, from blueprint/things/payroll-entry/verbs/submit.ts:
 *   payrollEntry  payroll-entry.id
 *   slips         EmployeeCount
 *
 * Refusals:
 *   SalarySlipExists      exit 48   PE-008  yours to refuse below, carrying employee; from blueprint/things/payroll-entry/errors.ts
 *   NoAssignmentAtStart   exit 49   PE-009  yours to refuse below, carrying employee; from blueprint/things/payroll-entry/errors.ts
 *   PayrollEntryNotDraft  exit 40   PE-900  the runtime's, when the payroll-entry isn't in draft, carrying state; from blueprint/things/payroll-entry/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its payrollEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payroll-entry/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/payroll-entry/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payroll-entry/verbs/submit.ts: p95 500ms.
 *
 * The payroll-entry's machine, from blueprint/things/payroll-entry/machine.ts (▶ marks this call):
 *     from       move         to         emits
 *     (creates)  create       draft      PayrollEntryDrafted
 *   ▶ draft      submit       submitted  PayrollEntrySubmitted
 *     submitted  submitSlips  accrued    SalarySlipsSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its payrollEntry.company;
 *   before it runs, it refuses PayrollEntryNotDraft unless the payroll-entry is in draft;
 *   before it runs, it hands in the payroll-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: payroll-entry.submit.load, payroll-entry.submit.slips;
 *   once it answers, it sets the payroll-entry's state to submitted;
 *   once it answers, it writes PayrollEntrySubmitted: payrollEntry and slips from the answer;
 *   the call is the span payroll-entry.submit, and its commit payroll-entry.submit.commit.
 */
const submit: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span payroll-entry.submit.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // SalarySlipExists: exit 48, PE-008.
    if (yield* Handlers.blank<boolean>("refuse SalarySlipExists when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SalarySlipExists was refused"));
      return yield* new SalarySlipExists({
        employee: yield* Handlers.blank("SalarySlipExists.employee, an employee.id"),
      });
    }

    // NoAssignmentAtStart: exit 49, PE-009.
    if (yield* Handlers.blank<boolean>("refuse NoAssignmentAtStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NoAssignmentAtStart was refused"));
      return yield* new NoAssignmentAtStart({
        employee: yield* Handlers.blank("NoAssignmentAtStart.employee, an employee.id"),
      });
    }

    // Step slips: database, in the store payroll-entry, salary-slip, salary-slip-detail, span payroll-entry.submit.slips.
    yield* steps.slips(Handlers.blank("slips: the work this step does"));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      payrollEntry: yield* Handlers.blank("payrollEntry, a payroll-entry.id"),
      // PayrollEntrySubmitted needs slips, and only the answer can give it.
      slips: yield* Handlers.blank("slips, an EmployeeCount"),
    };
  });

export default submit;
