// Scaffolded from blueprint/things/salary-structure/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure/cancel.handler.ts";

const { StructureInUse } = Errors.declared;

/**
 * salary-structure.cancel: Cancel a submitted salary structure no assignment or salary slip uses.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its salaryStructure.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure/verbs/cancel.ts:
 *   salaryStructure  salary-structure.id
 *
 * Answer, from blueprint/things/salary-structure/verbs/cancel.ts:
 *   salaryStructure  salary-structure.id
 *
 * Refusals:
 *   StructureInUse            exit 47   SS-007  yours to refuse below; from blueprint/things/salary-structure/errors.ts
 *   SalaryStructureNameTaken  exit 48   SS-008  the runtime's: another salary structure holds this company and salary structure name (salary-structure.oneNamePerCompany); from blueprint/things/salary-structure/invariants.ts
 *   SalaryStructureNotDraft   exit 40   SS-900  the runtime's, when the salary-structure isn't in submitted, carrying state; from blueprint/things/salary-structure/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its salaryStructure.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure/verbs/cancel.ts: p95 150ms.
 *
 * The salary-structure's machine, from blueprint/things/salary-structure/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      SalaryStructureDrafted
 *     draft      submit  submitted  SalaryStructureSubmitted
 *   ▶ submitted  cancel  cancelled  SalaryStructureCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its salaryStructure.company;
 *   before it runs, it refuses SalaryStructureNotDraft unless the salary-structure is in submitted;
 *   before it runs, it hands in the salary-structure it read as subject, so this handler never reads it again;
 *   each step is its own span: salary-structure.cancel.load, salary-structure.cancel.update;
 *   once it answers, it sets the salary-structure's state to cancelled;
 *   once it answers, it writes SalaryStructureCancelled: salaryStructure from the answer;
 *   the call is the span salary-structure.cancel, and its commit salary-structure.cancel.commit.
 */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span salary-structure.cancel.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // StructureInUse: exit 47, SS-007.
    if (yield* Handlers.blank<boolean>("refuse StructureInUse when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureInUse was refused"));
      return yield* new StructureInUse({});
    }

    // Step update: database, span salary-structure.cancel.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      salaryStructure: yield* Handlers.blank("salaryStructure, a salary-structure.id"),
    };
  });

export default cancel;
