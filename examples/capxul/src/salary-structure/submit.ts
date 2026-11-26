// Scaffolded from blueprint/things/salary-structure/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure/submit.handler.ts";

const { StructureNetPayNegative } = Errors.declared;

/**
 * salary-structure.submit: Submit a salary structure, so it can be assigned.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its salaryStructure.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure/verbs/submit.ts:
 *   salaryStructure  salary-structure.id
 *
 * Answer, from blueprint/things/salary-structure/verbs/submit.ts:
 *   salaryStructure  salary-structure.id
 *
 * Refusals:
 *   StructureNetPayNegative   exit 46   SS-006  yours to refuse below, carrying netPay; from blueprint/things/salary-structure/errors.ts
 *   SalaryStructureNameTaken  exit 48   SS-008  the runtime's: another salary structure holds this company and salary structure name (salary-structure.oneNamePerCompany); from blueprint/things/salary-structure/invariants.ts
 *   SalaryStructureNotDraft   exit 40   SS-900  the runtime's, when the salary-structure isn't in draft, carrying state; from blueprint/things/salary-structure/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its salaryStructure.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure/verbs/submit.ts: p95 150ms.
 *
 * The salary-structure's machine, from blueprint/things/salary-structure/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      SalaryStructureDrafted
 *   ▶ draft      submit  submitted  SalaryStructureSubmitted
 *     submitted  cancel  cancelled  SalaryStructureCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its salaryStructure.company;
 *   before it runs, it refuses SalaryStructureNotDraft unless the salary-structure is in draft;
 *   before it runs, it hands in the salary-structure it read as subject, so this handler never reads it again;
 *   each step is its own span: salary-structure.submit.update;
 *   once it answers, it sets the salary-structure's state to submitted;
 *   once it answers, it writes SalaryStructureSubmitted: salaryStructure from the answer;
 *   the call is the span salary-structure.submit, and its commit salary-structure.submit.commit.
 */
const submit: Handler = ({ salaryStructure }, { steps, move, subject }) =>
  Effect.gen(function* () {
    if (!subject) return yield* Effect.die(new Error(`salary structure ${salaryStructure} was checked and then not found`));

    // StructureNetPayNegative: exit 46, SS-006. A net pay of exactly nothing may be submitted.
    const netPay = subject["netPay"] as bigint;
    if (netPay < 0n) {
      yield* Effect.logInfo(`the structure's net pay is ${netPay}, below nothing`);
      return yield* new StructureNetPayNegative({ netPay });
    }

    // Step update: database, span salary-structure.submit.update. The move alone changes the structure.
    yield* steps.update(Effect.void);

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      salaryStructure,
    };
  });

export default submit;
