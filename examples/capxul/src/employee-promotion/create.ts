// Scaffolded from blueprint/things/employee-promotion/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-promotion/create.handler.ts";

const { PromotedEmployeeNotInCompany, PromotedEmployeeHasLeft, NewDesignationNotInCompany, DesignationUnchanged } = Errors.declared;

/**
 * employee-promotion.create: Draft a promotion: an employee's new job title, from a day.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-promotion/verbs/create.ts:
 *   company         employee-promotion.company
 *   employee        employee-promotion.employee
 *   promotionDate   employee-promotion.promotionDate
 *   newDesignation  employee-promotion.newDesignation
 *
 * Answer, from blueprint/things/employee-promotion/verbs/create.ts:
 *   employeePromotion  employee-promotion.id
 *
 * Refusals:
 *   PromotedEmployeeNotInCompany  exit 41   PM-001  yours to refuse below; from blueprint/things/employee-promotion/errors.ts
 *   PromotedEmployeeHasLeft       exit 42   PM-002  yours to refuse below; from blueprint/things/employee-promotion/errors.ts
 *   NewDesignationNotInCompany    exit 43   PM-003  yours to refuse below; from blueprint/things/employee-promotion/errors.ts
 *   DesignationUnchanged          exit 44   PM-004  yours to refuse below; from blueprint/things/employee-promotion/errors.ts
 *   EmployeeNotFound              exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   DesignationNotFound           exit 4    DS-901  the runtime's, when no designation has that id, carrying id; from blueprint/things/designation/thing.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-promotion/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-promotion/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-promotion/verbs/create.ts: p95 150ms.
 *
 * The employee-promotion's machine, from blueprint/things/employee-promotion/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      EmployeePromotionDrafted
 *     draft      submit  submitted  EmployeePromoted
 *     submitted  cancel  cancelled  EmployeePromotionCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the newDesignation and hands it in as refs.newDesignation, refusing DesignationNotFound if there is none;
 *   before it runs, it mints the employee-promotion's new id and hands it in as id;
 *   each step is its own span: employee-promotion.create.load, employee-promotion.create.insert;
 *   once it answers, it sets the employee-promotion's state to draft;
 *   once it answers, it writes EmployeePromotionDrafted: employeePromotion from the answer, employee from the payload;
 *   the call is the span employee-promotion.create, and its commit employee-promotion.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span employee-promotion.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // PromotedEmployeeNotInCompany: exit 41, PM-001.
    if (yield* Handlers.blank<boolean>("refuse PromotedEmployeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PromotedEmployeeNotInCompany was refused"));
      return yield* new PromotedEmployeeNotInCompany({});
    }

    // PromotedEmployeeHasLeft: exit 42, PM-002.
    if (yield* Handlers.blank<boolean>("refuse PromotedEmployeeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PromotedEmployeeHasLeft was refused"));
      return yield* new PromotedEmployeeHasLeft({});
    }

    // NewDesignationNotInCompany: exit 43, PM-003.
    if (yield* Handlers.blank<boolean>("refuse NewDesignationNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NewDesignationNotInCompany was refused"));
      return yield* new NewDesignationNotInCompany({});
    }

    // DesignationUnchanged: exit 44, PM-004.
    if (yield* Handlers.blank<boolean>("refuse DesignationUnchanged when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why DesignationUnchanged was refused"));
      return yield* new DesignationUnchanged({});
    }

    // Step insert: database, span employee-promotion.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // EmployeePromotionDrafted needs employeePromotion, and only the answer can give it.
      employeePromotion: id,
    };
  });

export default create;
