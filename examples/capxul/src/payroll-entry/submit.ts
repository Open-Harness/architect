// Scaffolded from blueprint/things/payroll-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import type { InstanceOf } from "orthograph";
import { Ids, Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { PayrollEmployeeDetail } from "../../blueprint/things/payroll-employee-detail/thing.ts";
import { SalaryDetail } from "../../blueprint/things/salary-detail/thing.ts";
import { SalarySlip } from "../../blueprint/things/salary-slip/thing.ts";
import { SalarySlipDetail } from "../../blueprint/things/salary-slip-detail/thing.ts";
import { SalaryStructureAssignment } from "../../blueprint/things/salary-structure-assignment/thing.ts";
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
const submit: Handler = ({ payrollEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Every matching row counts as read at commit; the limit is set so the page holds them all.
    const all = { order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;
    if (!subject) return yield* Effect.die(new Error(`payroll entry ${payrollEntry} was checked and then not found`));
    const startDate = subject["startDate"] as string;
    const endDate = subject["endDate"] as string;

    // Step load: database, span payroll-entry.submit.load. The entry's employees in its order, each with their record,
    // their slips and their submitted assignments.
    const employees = yield* steps.load(
      Effect.gen(function* () {
        const rows = yield* records.list({ ...all, thing: PayrollEmployeeDetail, where: { payrollEntry }, state: undefined });
        return yield* Effect.forEach(rows.items, (row) => {
          const employee = row["employee"] as string;
          return Effect.all({
            id: Effect.succeed(employee),
            record: records.find(Employee, employee),
            slips: records.list({ ...all, thing: SalarySlip, where: { employee }, state: undefined }),
            assignments: records.list({ ...all, thing: SalaryStructureAssignment, where: { employee }, state: "submitted" }),
          });
        });
      }),
    );

    // Refusal order (errors.ts): SalarySlipExists over every employee, then NoAssignmentAtStart.
    // SalarySlipExists: exit 48, PE-008. A slip from another entry, draft or submitted, for these very days.
    const paid = employees.find(({ slips }) =>
      slips.items.some((s) => s["payrollEntry"] !== payrollEntry && s["startDate"] === startDate && s["endDate"] === endDate),
    );
    if (paid) {
      yield* Effect.logInfo(`${paid.id} already has a slip from ${startDate} to ${endDate}`);
      return yield* new SalarySlipExists({ employee: paid.id as never });
    }

    // NoAssignmentAtStart: exit 49, PE-009. The structure is that of the latest submitted assignment starting by the
    // last day; one of its submitted assignments must start by the first day, or by the joining day for a joiner.
    const paying = employees.map((e) => {
      const byEnd = e.assignments.items.filter((a) => (a["fromDate"] as string) <= endDate);
      const latest = byEnd.reduce<(typeof byEnd)[number] | undefined>(
        (best, a) => (best === undefined || (a["fromDate"] as string) > (best["fromDate"] as string) ? a : best),
        undefined,
      );
      const structure = latest?.["salaryStructure"] as string | undefined;
      const joined = (e.record?.["dateOfJoining"] as string | undefined) ?? startDate;
      const from = joined > startDate ? joined : startDate;
      const started = structure !== undefined && byEnd.some((a) => a["salaryStructure"] === structure && (a["fromDate"] as string) <= from);
      return { id: e.id, structure, started };
    });
    const unstarted = paying.find((p) => !p.started);
    if (unstarted) {
      yield* Effect.logInfo(`${unstarted.id} has no assignment to their structure by the start of the payroll`);
      return yield* new NoAssignmentAtStart({ employee: unstarted.id as never });
    }

    // Step slips: database, in the store payroll-entry, salary-slip, salary-slip-detail, span payroll-entry.submit.slips.
    // A draft slip per employee in the entry's order, its lines its structure's (earnings, then deductions, numbered
    // as on the structure), every line paid in full.
    yield* steps.slips(
      Effect.forEach(paying, ({ id: employee, structure }) =>
        Effect.gen(function* () {
          const lines = (yield* records.list({ ...all, thing: SalaryDetail, where: { salaryStructure: structure }, state: undefined })).items;
          const ordered = [...lines.filter((l) => l["type"] === "Earning"), ...lines.filter((l) => l["type"] === "Deduction")];
          const sum = (type: string) => ordered.filter((l) => l["type"] === type).reduce((total, l) => total + (l["amount"] as bigint), 0n);
          const grossPay = sum("Earning");
          const totalDeduction = sum("Deduction");
          const slip = yield* Ids.of(SalarySlip.fields.id);
          yield* records.insert(SalarySlip, {
            id: slip,
            company: subject["company"] as never,
            employee: employee as never,
            payrollEntry,
            salaryStructure: structure as never,
            postingDate: subject["postingDate"] as never,
            startDate: startDate as never,
            endDate: endDate as never,
            grossPay,
            totalDeduction,
            netPay: grossPay - totalDeduction,
            status: "Draft",
            // No journal entry until submit-slips books it. `InstanceOf` types every field as required.
          } as unknown as Omit<InstanceOf<typeof SalarySlip>, "state">);
          for (const l of ordered) {
            const lineId = yield* Ids.of(SalarySlipDetail.fields.id);
            yield* records.insert(SalarySlipDetail, {
              id: lineId,
              salarySlip: slip,
              type: l["type"] as never,
              line: l["line"] as bigint,
              salaryComponent: l["salaryComponent"] as never,
              amount: l["amount"] as bigint,
            });
          }
        }),
      ),
    );

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      payrollEntry,
      // PayrollEntrySubmitted needs slips, and only the answer can give it.
      slips: BigInt(paying.length),
    };
  });

export default submit;
