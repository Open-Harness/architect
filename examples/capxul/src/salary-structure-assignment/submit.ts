// Scaffolded from blueprint/things/salary-structure-assignment/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { SalaryStructure } from "../../blueprint/things/salary-structure/thing.ts";
import { SalaryStructureAssignment } from "../../blueprint/things/salary-structure-assignment/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure-assignment/submit.handler.ts";

const { AssignmentExists, AssignedStructureNotSubmitted } = Errors.declared;

/**
 * salary-structure-assignment.submit: Submit an assignment, so payroll pays the employee by its structure from its day on.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its salaryStructureAssignment.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure-assignment/verbs/submit.ts:
 *   salaryStructureAssignment  salary-structure-assignment.id
 *
 * Answer, from blueprint/things/salary-structure-assignment/verbs/submit.ts:
 *   salaryStructureAssignment  salary-structure-assignment.id
 *   employee                   salary-structure-assignment.employee
 *   salaryStructure            salary-structure-assignment.salaryStructure
 *
 * Refusals:
 *   AssignmentExists                   exit 43   SA-003  yours to refuse below, carrying fromDate; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignedStructureNotSubmitted      exit 46   SA-006  yours to refuse below; from blueprint/things/salary-structure-assignment/errors.ts
 *   SalaryStructureAssignmentNotDraft  exit 40   SA-900  the runtime's, when the salary-structure-assignment isn't in draft, carrying state; from blueprint/things/salary-structure-assignment/machine.ts
 *   NotAllowed                         exit 3    AR-001  the runtime's, when the caller isn't the owner of its salaryStructureAssignment.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict                exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure-assignment/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure-assignment/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure-assignment/verbs/submit.ts: p95 150ms.
 *
 * The salary-structure-assignment's machine, from blueprint/things/salary-structure-assignment/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      SalaryStructureAssigned
 *   ▶ draft      submit  submitted  SalaryStructureAssignmentSubmitted
 *     submitted  cancel  cancelled  SalaryStructureAssignmentCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its salaryStructureAssignment.company;
 *   before it runs, it refuses SalaryStructureAssignmentNotDraft unless the salary-structure-assignment is in draft;
 *   before it runs, it hands in the salary-structure-assignment it read as subject, so this handler never reads it again;
 *   each step is its own span: salary-structure-assignment.submit.load, salary-structure-assignment.submit.update;
 *   once it answers, it sets the salary-structure-assignment's state to submitted;
 *   once it answers, it writes SalaryStructureAssignmentSubmitted: salaryStructureAssignment from the answer;
 *   the call is the span salary-structure-assignment.submit, and its commit salary-structure-assignment.submit.commit.
 */
const submit: Handler = ({ salaryStructureAssignment }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const all = { order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;
    if (!subject) return yield* Effect.die(new Error(`assignment ${salaryStructureAssignment} was checked and then not found`));
    const employee = subject["employee"] as string;
    const salaryStructure = subject["salaryStructure"] as string;
    const fromDate = subject["fromDate"] as string;

    // Step load: database, span salary-structure-assignment.submit.load. The employee's submitted assignments, and the
    // structure as it stands now.
    const { held, structure } = yield* steps.load(
      Effect.all({
        held: records.list({ ...all, thing: SalaryStructureAssignment, where: { employee }, state: "submitted" }),
        structure: records.find(SalaryStructure, salaryStructure),
      }),
    );

    // Refusal order (errors.ts): AssignmentExists, then AssignedStructureNotSubmitted. The employee isn't judged again.
    // AssignmentExists: exit 43, SA-003. Another submitted assignment of theirs starts that day.
    if (held.items.some((a) => a["fromDate"] === fromDate)) {
      yield* Effect.logInfo(`the employee already has a submitted assignment from ${fromDate}`);
      return yield* new AssignmentExists({ fromDate: fromDate as never });
    }

    // AssignedStructureNotSubmitted: exit 46, SA-006. Cancelled since the draft was made.
    if (!structure || structure.state !== "submitted") {
      yield* Effect.logInfo(`the structure is ${structure?.state ?? "missing"}, not submitted`);
      return yield* new AssignedStructureNotSubmitted({});
    }

    // Step update: database, span salary-structure-assignment.submit.update. The move alone changes the assignment.
    yield* steps.update(Effect.void);

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      salaryStructureAssignment,
      employee: employee as never,
      salaryStructure: salaryStructure as never,
    };
  });

export default submit;
