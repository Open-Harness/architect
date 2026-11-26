// Scaffolded from blueprint/things/payroll-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { PayrollEmployeeDetail } from "../../blueprint/things/payroll-employee-detail/thing.ts";
import { PayrollEntry } from "../../blueprint/things/payroll-entry/thing.ts";
import { SalarySlip } from "../../blueprint/things/salary-slip/thing.ts";
import { SalaryStructureAssignment } from "../../blueprint/things/salary-structure-assignment/thing.ts";
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
const create: Handler = ({ company, postingDate, startDate, endDate, costCenter, payrollPayableAccount }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Every matching row counts as read at commit; the limit is set so the page holds them all.
    const all = { order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

    // Step load: database, span payroll-entry.create.load. The runtime read the account and the cost center and hands
    // them in; this step reads the company's employees at work, in the order they were hired, with each one's
    // submitted assignments and slips.
    const { account, center, candidates } = yield* steps.load(
      Effect.gen(function* () {
        const working = yield* records.list({ ...all, thing: Employee, where: { company }, state: "active" });
        const candidates = yield* Effect.forEach(working.items, (employee) =>
          Effect.all({
            employee: Effect.succeed(employee),
            assignments: records.list({ ...all, thing: SalaryStructureAssignment, where: { employee: employee["id"] }, state: "submitted" }),
            slips: records.list({ ...all, thing: SalarySlip, where: { employee: employee["id"] }, state: undefined }),
          }),
        );
        return { account: refs.payrollPayableAccount, center: refs.costCenter, candidates };
      }),
    );
    if (!account) return yield* Effect.die(new Error(`account ${payrollPayableAccount} was read and then not found`));
    if (!center) return yield* Effect.die(new Error(`cost center ${costCenter} was read and then not found`));

    // Refusal order (errors.ts).
    // PayrollEndsBeforeStart: exit 41, PE-001. A one-day payroll is allowed.
    if (endDate < startDate) {
      yield* Effect.logInfo(`the payroll ends on ${endDate}, before it starts on ${startDate}`);
      return yield* new PayrollEndsBeforeStart({ startDate });
    }

    // PayableAccountNotInCompany: exit 42, PE-002.
    if (account["company"] !== company) {
      yield* Effect.logInfo("the payable account belongs to another company");
      return yield* new PayableAccountNotInCompany({});
    }

    // PayableAccountIsGroup: exit 43, PE-003.
    if (account.state !== "ledger") {
      yield* Effect.logInfo("the payable account is a group");
      return yield* new PayableAccountIsGroup({});
    }

    // PayableAccountHasType: exit 44, PE-004. Any account type is refused.
    if (account["accountType"] !== undefined) {
      yield* Effect.logInfo(`the payable account has the type ${account["accountType"]}`);
      return yield* new PayableAccountHasType({});
    }

    // PayrollCostCenterNotInCompany: exit 45, PE-005.
    if (center["company"] !== company) {
      yield* Effect.logInfo("the cost center belongs to another company");
      return yield* new PayrollCostCenterNotInCompany({});
    }

    // PayrollCostCenterIsGroup: exit 46, PE-006.
    if (center.state !== "ledger") {
      yield* Effect.logInfo("the cost center is a group");
      return yield* new PayrollCostCenterIsGroup({});
    }

    // HRMS's `fill_employee_details`: joined by the last day, a submitted assignment starting by then, and no
    // submitted slip for these very days (`remove_payrolled_employees`).
    const employees = candidates
      .filter(({ employee, assignments, slips }) =>
        (employee["dateOfJoining"] as string) <= endDate &&
        assignments.items.some((a) => (a["fromDate"] as string) <= endDate) &&
        !slips.items.some((s) => s["status"] === "Submitted" && s["startDate"] === startDate && s["endDate"] === endDate),
      )
      .map(({ employee }) => employee["id"] as string);

    // NoEmployeesFound: exit 47, PE-007.
    if (employees.length === 0) {
      yield* Effect.logInfo("no employee of the company is to be paid for these days");
      return yield* new NoEmployeesFound({});
    }

    // Step insert: database, in the store payroll-entry, payroll-employee-detail, span payroll-entry.create.insert.
    const numberOfEmployees = BigInt(employees.length);
    yield* steps.insert(
      Effect.gen(function* () {
        yield* records.insert(PayrollEntry, { id, company, postingDate, startDate, endDate, costCenter, payrollPayableAccount, numberOfEmployees });
        for (const employee of employees) {
          const rowId = yield* Ids.of(PayrollEmployeeDetail.fields.id);
          yield* records.insert(PayrollEmployeeDetail, { id: rowId, payrollEntry: id, employee: employee as never });
        }
      }),
    );

    // The move create, to draft.
    yield* move();

    return {
      // PayrollEntryDrafted needs payrollEntry, and only the answer can give it.
      payrollEntry: id,
      numberOfEmployees,
    };
  });

export default create;
