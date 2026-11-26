// Scaffolded from blueprint/things/payroll-entry/verbs/submit-slips.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { FiscalYear } from "../../blueprint/things/fiscal-year/thing.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";
import { JournalEntry } from "../../blueprint/things/journal-entry/thing.ts";
import { JournalEntryAccount } from "../../blueprint/things/journal-entry-account/thing.ts";
import { SalaryComponent } from "../../blueprint/things/salary-component/thing.ts";
import { SalarySlip } from "../../blueprint/things/salary-slip/thing.ts";
import { SalarySlipDetail } from "../../blueprint/things/salary-slip-detail/thing.ts";
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
const submitSlips: Handler = ({ payrollEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Every matching row counts as read at commit; the limit is set so the page holds them all.
    const all = { order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;
    if (!subject) return yield* Effect.die(new Error(`payroll entry ${payrollEntry} was checked and then not found`));
    const company = subject["company"] as string;
    const postingDate = subject["postingDate"] as string;
    const costCenter = subject["costCenter"] as string;

    // Step load: database, span payroll-entry.submit-slips.load. The entry's draft slips in the order its submit made
    // them, each slip's lines with the account their component is booked to, and the company's fiscal years.
    const { slips, years } = yield* steps.load(
      Effect.gen(function* () {
        const made = yield* records.list({ ...all, thing: SalarySlip, where: { payrollEntry }, state: undefined });
        const slips = yield* Effect.forEach(
          made.items.filter((s) => s["status"] === "Draft"),
          (slip) =>
            Effect.gen(function* () {
              const details = yield* records.list({ ...all, thing: SalarySlipDetail, where: { salarySlip: slip["id"] }, state: undefined });
              const lines = yield* Effect.forEach(details.items, (line) =>
                Effect.gen(function* () {
                  const component = yield* records.find(SalaryComponent, line["salaryComponent"] as string);
                  if (!component) return yield* Effect.die(new Error(`salary component ${line["salaryComponent"]} on a slip was not found`));
                  return { type: line["type"] as string, amount: line["amount"] as bigint, account: component["account"] as string };
                }),
              );
              return { slip, lines };
            }),
        );
        const years = yield* records.list({ ...all, thing: FiscalYear, where: { company }, state: undefined });
        return { slips, years: years.items };
      }),
    );

    // AccrualOutsideFiscalYear: exit 50, PE-010. One of the company's own years, both ends counted, before any write.
    if (!years.some((y) => (y["yearStartDate"] as string) <= postingDate && postingDate <= (y["yearEndDate"] as string))) {
      yield* Effect.logInfo(`${postingDate} falls in none of the company's fiscal years`);
      return yield* new AccrualOutsideFiscalYear({ postingDate: postingDate as never });
    }

    // HRMS's `make_accrual_jv_entry`: a debit per earning account and a credit per deduction account, each summed over
    // every slip and in the order its account is first met, slip by slip and line by line; then the net pay credited
    // to the payable account. An account booked both ways keeps a line each. A line of 0 is left out.
    const totals = (type: string) => {
      const byAccount = new Map<string, bigint>();
      for (const { lines } of slips) for (const l of lines) if (l.type === type) byAccount.set(l.account, (byAccount.get(l.account) ?? 0n) + l.amount);
      return [...byAccount];
    };
    const netPay = slips.reduce((total, { slip }) => total + (slip["netPay"] as bigint), 0n);
    const lines = [
      ...totals("Earning").map(([account, amount]) => ({ account, debit: amount, credit: 0n })),
      ...totals("Deduction").map(([account, amount]) => ({ account, debit: 0n, credit: amount })),
      { account: subject["payrollPayableAccount"] as string, debit: 0n, credit: netPay },
    ].filter((l) => l.debit !== 0n || l.credit !== 0n);
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0n);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0n);

    // Step accrue: database, in the store payroll-entry, salary-slip, journal-entry, journal-entry-account, gl-entry,
    // span payroll-entry.submit-slips.accrue. Snag #1079: no operation can run another, so this writes the submitted
    // journal entry, its lines and one ledger line each itself, in the shape 7a's create and submit write them.
    const journalEntry = yield* Ids.of(JournalEntry.fields.id);
    yield* steps.accrue(
      Effect.gen(function* () {
        yield* records.insert(
          JournalEntry,
          {
            id: journalEntry,
            company: company as never,
            postingDate: postingDate as never,
            userRemark: `Accrual Journal Entry for salaries from ${subject["startDate"]} to ${subject["endDate"]}` as never,
            totalDebit,
            totalCredit,
          },
          "submitted",
        );
        for (const [i, l] of lines.entries()) {
          const lineId = yield* Ids.of(JournalEntryAccount.fields.id);
          yield* records.insert(JournalEntryAccount, {
            id: lineId,
            journalEntry,
            line: BigInt(i + 1),
            account: l.account as never,
            costCenter: costCenter as never,
            debit: l.debit,
            credit: l.credit,
          });
          const glId = yield* Ids.of(GLEntry.fields.id);
          yield* records.insert(GLEntry, {
            id: glId,
            company: company as never,
            account: l.account as never,
            costCenter: costCenter as never,
            postingDate: postingDate as never,
            debit: l.debit,
            credit: l.credit,
            voucherType: "Journal Entry",
            voucherId: journalEntry,
            isCancelled: false,
          });
        }
        for (const { slip } of slips) yield* records.update(SalarySlip, slip["id"] as string, { status: "Submitted", journalEntry });
      }),
    );

    // The move submitSlips, from submitted, to accrued.
    yield* move();

    return {
      payrollEntry,
      // SalarySlipsSubmitted needs journalEntry, and only the answer can give it.
      journalEntry,
      // SalarySlipsSubmitted needs slips, and only the answer can give it.
      slips: BigInt(slips.length),
    };
  });

export default submitSlips;
