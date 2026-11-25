// Scaffolded from blueprint/things/payroll-entry/verbs/submit-slips.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payroll-entry/submit-slips.handler.ts";

const { AccrualOutsideFiscalYear } = Errors.declared;

/**
 * payroll-entry.submit-slips: Submit a payroll entry's salary slips, booking their pay in one accrual journal entry.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its payrollEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payroll-entry/verbs/submit-slips.ts:
 *   payrollEntry  payroll-entry.id
 *
 * Answer, from blueprint/things/payroll-entry/verbs/submit-slips.ts:
 *   payrollEntry  payroll-entry.id
 *   journalEntry  journal-entry.id
 *   slips         EmployeeCount
 *
 * Refusals:
 *   AccrualOutsideFiscalYear  exit 50   PE-010  yours to refuse below, carrying postingDate; from blueprint/things/payroll-entry/errors.ts
 *   PayrollEntryNotDraft      exit 40   PE-900  the runtime's, when the payroll-entry isn't in submitted, carrying state; from blueprint/things/payroll-entry/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its payrollEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payroll-entry/verbs/submit-slips.ts
 *
 * Idempotent by request, from blueprint/things/payroll-entry/verbs/submit-slips.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payroll-entry/verbs/submit-slips.ts: p95 500ms.
 *
 * The payroll-entry's machine, from blueprint/things/payroll-entry/machine.ts (▶ marks this call):
 *     from       move         to         emits
 *     (creates)  create       draft      PayrollEntryDrafted
 *     draft      submit       submitted  PayrollEntrySubmitted
 *   ▶ submitted  submitSlips  accrued    SalarySlipsSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its payrollEntry.company;
 *   before it runs, it refuses PayrollEntryNotDraft unless the payroll-entry is in submitted;
 *   before it runs, it hands in the payroll-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: payroll-entry.submit-slips.load, payroll-entry.submit-slips.accrue;
 *   once it answers, it sets the payroll-entry's state to accrued;
 *   once it answers, it writes SalarySlipsSubmitted: payrollEntry, journalEntry and slips from the answer;
 *   the call is the span payroll-entry.submit-slips, and its commit payroll-entry.submit-slips.commit.
 */
const submitSlips: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span payroll-entry.submit-slips.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AccrualOutsideFiscalYear: exit 50, PE-010.
    if (yield* Handlers.blank<boolean>("refuse AccrualOutsideFiscalYear when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AccrualOutsideFiscalYear was refused"));
      return yield* new AccrualOutsideFiscalYear({
        postingDate: yield* Handlers.blank("AccrualOutsideFiscalYear.postingDate, a Day"),
      });
    }

    // Step accrue: database, in the store payroll-entry, salary-slip, journal-entry, journal-entry-account, gl-entry, span payroll-entry.submit-slips.accrue.
    yield* steps.accrue(Handlers.blank("accrue: the work this step does"));

    // The move submitSlips, from submitted, to accrued.
    yield* move();

    return {
      payrollEntry: yield* Handlers.blank("payrollEntry, a payroll-entry.id"),
      // SalarySlipsSubmitted needs journalEntry, and only the answer can give it.
      journalEntry: yield* Handlers.blank("journalEntry, a journal-entry.id"),
      // SalarySlipsSubmitted needs slips, and only the answer can give it.
      slips: yield* Handlers.blank("slips, an EmployeeCount"),
    };
  });

export default submitSlips;
