// Scaffolded from blueprint/things/employee-separation/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { EmployeeSeparation } from "../../blueprint/things/employee-separation/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-separation/create.handler.ts";

const { SeparatedEmployeeNotInCompany } = Errors.declared;

/**
 * employee-separation.create: Start an employee's separation, from their resignation letter.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-separation/verbs/create.ts:
 *   company                employee-separation.company
 *   employee               employee-separation.employee
 *   resignationLetterDate  employee-separation.resignationLetterDate
 *   boardingBeginsOn       employee-separation.boardingBeginsOn
 *
 * Answer, from blueprint/things/employee-separation/verbs/create.ts:
 *   employeeSeparation  employee-separation.id
 *
 * Refusals:
 *   SeparatedEmployeeNotInCompany  exit 41   SP-001  yours to refuse below; from blueprint/things/employee-separation/errors.ts
 *   SeparationAlreadyOpen          exit 42   SP-002  the runtime's: another pending or inProcess employee separation holds this employee (employee-separation.oneOpenSeparationPerEmployee); from blueprint/things/employee-separation/invariants.ts
 *   EmployeeNotFound               exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-separation/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-separation/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-separation/verbs/create.ts: p95 150ms.
 *
 * The employee-separation's machine, from blueprint/things/employee-separation/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *   ▶ (creates)  create    pending    EmployeeSeparationStarted
 *     pending    begin     inProcess  EmployeeSeparationBegun
 *     pending    complete  completed  EmployeeSeparationCompleted
 *     inProcess  complete  completed  EmployeeSeparationCompleted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it mints the employee-separation's new id and hands it in as id;
 *   each step is its own span: employee-separation.create.load, employee-separation.create.insert;
 *   once it answers, it sets the employee-separation's state to pending;
 *   once it answers, it writes EmployeeSeparationStarted: employeeSeparation from the answer, employee from the payload;
 *   the call is the span employee-separation.create, and its commit employee-separation.create.commit.
 */
const create: Handler = ({ company, employee, resignationLetterDate, boardingBeginsOn }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span employee-separation.create.load. The runtime read the employee and hands it in, so this
    // step only takes it. Its state isn't judged: a separation may start for an employee who has already left, as
    // HRMS's Employee Separation judges neither status nor days (CX-employee-moves).
    const held = yield* steps.load(Effect.succeed(refs.employee));
    if (!held) return yield* Effect.die(new Error(`employee ${employee} was read and then not found`));

    // SeparatedEmployeeNotInCompany: exit 41, SP-001. Judged here, before the runtime's SeparationAlreadyOpen at commit.
    if (held["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new SeparatedEmployeeNotInCompany({});
    }

    // Step insert: database, span employee-separation.create.insert. A second open one for this employee is the
    // runtime's refusal (oneOpenSeparationPerEmployee).
    yield* steps.insert(
      records.insert(EmployeeSeparation, { id, company, employee, resignationLetterDate, boardingBeginsOn }),
    );

    // The move create, to pending.
    yield* move();

    return {
      // EmployeeSeparationStarted needs employeeSeparation, and only the answer can give it.
      employeeSeparation: id,
    };
  });

export default create;
