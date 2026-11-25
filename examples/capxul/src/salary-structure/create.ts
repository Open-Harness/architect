// Scaffolded from blueprint/things/salary-structure/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure/create.handler.ts";

const { StructureWithoutEarnings, StructureComponentNotInCompany, StructureComponentWrongType, StructureLineWithoutAmount, StructureComponentRepeated } = Errors.declared;

/**
 * salary-structure.create: Draft a salary structure with its earnings and deductions.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure/verbs/create.ts:
 *   company              salary-structure.company
 *   salaryStructureName  salary-structure.salaryStructureName
 *   earnings             schema
 *   deductions           schema
 *
 * Answer, from blueprint/things/salary-structure/verbs/create.ts:
 *   salaryStructure  salary-structure.id
 *   totalEarning     salary-structure.totalEarning
 *   totalDeduction   salary-structure.totalDeduction
 *   netPay           salary-structure.netPay
 *
 * Refusals:
 *   StructureWithoutEarnings        exit 41   SS-001  yours to refuse below; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentNotInCompany  exit 42   SS-002  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentWrongType     exit 43   SS-003  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureLineWithoutAmount      exit 44   SS-004  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentRepeated      exit 45   SS-005  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   SalaryStructureNameTaken        exit 48   SS-008  the runtime's: another salary structure holds this company and salary structure name (salary-structure.oneNamePerCompany); from blueprint/things/salary-structure/invariants.ts
 *   NotAllowed                      exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict             exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure/verbs/create.ts: p95 200ms.
 *
 * The salary-structure's machine, from blueprint/things/salary-structure/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      SalaryStructureDrafted
 *     draft      submit  submitted  SalaryStructureSubmitted
 *     submitted  cancel  cancelled  SalaryStructureCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the salary-structure's new id and hands it in as id;
 *   each step is its own span: salary-structure.create.load, salary-structure.create.insert;
 *   once it answers, it sets the salary-structure's state to draft;
 *   once it answers, it writes SalaryStructureDrafted: salaryStructure and netPay from the answer, company from the payload;
 *   the call is the span salary-structure.create, and its commit salary-structure.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span salary-structure.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // StructureWithoutEarnings: exit 41, SS-001.
    if (yield* Handlers.blank<boolean>("refuse StructureWithoutEarnings when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureWithoutEarnings was refused"));
      return yield* new StructureWithoutEarnings({});
    }

    // StructureComponentNotInCompany: exit 42, SS-002.
    if (yield* Handlers.blank<boolean>("refuse StructureComponentNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureComponentNotInCompany was refused"));
      return yield* new StructureComponentNotInCompany({
        salaryComponent: yield* Handlers.blank("StructureComponentNotInCompany.salaryComponent, a salary-component.id"),
      });
    }

    // StructureComponentWrongType: exit 43, SS-003.
    if (yield* Handlers.blank<boolean>("refuse StructureComponentWrongType when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureComponentWrongType was refused"));
      return yield* new StructureComponentWrongType({
        salaryComponent: yield* Handlers.blank("StructureComponentWrongType.salaryComponent, a salary-component.id"),
      });
    }

    // StructureLineWithoutAmount: exit 44, SS-004.
    if (yield* Handlers.blank<boolean>("refuse StructureLineWithoutAmount when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureLineWithoutAmount was refused"));
      return yield* new StructureLineWithoutAmount({
        salaryComponent: yield* Handlers.blank("StructureLineWithoutAmount.salaryComponent, a salary-component.id"),
      });
    }

    // StructureComponentRepeated: exit 45, SS-005.
    if (yield* Handlers.blank<boolean>("refuse StructureComponentRepeated when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StructureComponentRepeated was refused"));
      return yield* new StructureComponentRepeated({
        salaryComponent: yield* Handlers.blank("StructureComponentRepeated.salaryComponent, a salary-component.id"),
      });
    }

    // Step insert: database, in the store salary-structure, salary-detail, span salary-structure.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // SalaryStructureDrafted needs salaryStructure, and only the answer can give it.
      salaryStructure: id,
      totalEarning: yield* Handlers.blank("totalEarning, a salary-structure.totalEarning"),
      totalDeduction: yield* Handlers.blank("totalDeduction, a salary-structure.totalDeduction"),
      netPay: yield* Handlers.blank("netPay, a salary-structure.netPay"),
    };
  });

export default create;
