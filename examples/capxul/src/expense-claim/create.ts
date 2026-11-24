// Scaffolded from blueprint/things/expense-claim/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/expense-claim/create.handler.ts";
import { ExpenseClaim } from "../../blueprint/things/expense-claim/thing.ts";

const { ClaimantNotActive, EmployeeNotInCompany } = Errors.declared;

/**
 * expense-claim.create: Start an employee's claim for expenses the company pays back.
 *
 * Who may call:
 *   the self of its employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/expense-claim/verbs/create.ts:
 *   company      expense-claim.company
 *   employee     expense-claim.employee
 *   postingDate  expense-claim.postingDate
 *
 * Answer, from blueprint/things/expense-claim/verbs/create.ts:
 *   expenseClaim  expense-claim.id
 *
 * Refusals:
 *   ClaimantNotActive     exit 41   EC-001  yours to refuse below; from blueprint/things/expense-claim/errors.ts
 *   EmployeeNotInCompany  exit 42   EC-002  yours to refuse below; from blueprint/things/expense-claim/errors.ts
 *   CompanyNotFound       exit 4    CO-901  the runtime's, when no company has that id, carrying id; from blueprint/things/company/thing.ts
 *   EmployeeNotFound      exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the self of its employee, or the owner of its company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/expense-claim/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/expense-claim/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/expense-claim/verbs/create.ts: p95 150ms.
 *
 * The expense-claim's machine, from blueprint/things/expense-claim/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  create   draft     ExpenseClaimCreated
 *     draft      approve  approved  ExpenseClaimApproved
 *     draft      reject   rejected  ExpenseClaimRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employee, or the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company, refusing CompanyNotFound if there is none;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it mints the expense-claim's new id and hands it in as id;
 *   each step is its own span: expense-claim.create.load, expense-claim.create.insert;
 *   once it answers, it sets the expense-claim's state to draft;
 *   once it answers, it writes ExpenseClaimCreated: expenseClaim from the answer, company and employee from the payload;
 *   the call is the span expense-claim.create, and its commit expense-claim.create.commit.
 */
const create: Handler = ({ company, employee, postingDate }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span expense-claim.create.load. The runtime read the employee for the role check and
    // hands it in, so this step only takes it; a missing one never reaches here.
    const claimant = yield* steps.load(Effect.succeed(refs.employee));
    if (!claimant) return yield* Effect.die(new Error(`employee ${employee} was read for the role check and then not found`));

    // Refusal order (errors.ts): EmployeeNotInCompany before ClaimantNotActive.
    // EmployeeNotInCompany: exit 42, EC-002.
    if (claimant["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new EmployeeNotInCompany({});
    }

    // ClaimantNotActive: exit 41, EC-001. Judged on create only (CX-expense-leavers): a claim already open when the
    // employee leaves can still take lines and be approved.
    if (claimant.state !== "active") {
      yield* Effect.logInfo(`the employee is ${claimant.state ?? "in no state"}, not active`);
      return yield* new ClaimantNotActive({});
    }

    // Step insert: database, span expense-claim.create.insert. A new claim holds no expenses, so both totals are 0.
    yield* steps.insert(
      records.insert(ExpenseClaim, { id, company, employee, postingDate, totalClaimedAmount: 0n, totalSanctionedAmount: 0n }),
    );

    // The move create, to draft.
    yield* move();

    return {
      // ExpenseClaimCreated needs expenseClaim, and only the answer can give it.
      expenseClaim: id,
    };
  });

export default create;
