// Scaffolded from blueprint/things/appraisal/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal/create.handler.ts";

const { AppraisedEmployeeNotInCompany, AppraisedEmployeeHasLeft, AppraisalCycleCompleted, AppraisalTemplateNotInCompany } = Errors.declared;

/**
 * appraisal.create: Make an employee's appraisal in a cycle, by a template.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisalCycle.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal/verbs/create.ts:
 *   employee           appraisal.employee
 *   appraisalCycle     appraisal.appraisalCycle
 *   appraisalTemplate  appraisal.appraisalTemplate
 *
 * Answer, from blueprint/things/appraisal/verbs/create.ts:
 *   appraisal  appraisal.id
 *
 * Refusals:
 *   AppraisedEmployeeNotInCompany  exit 41   AP-001  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisedEmployeeHasLeft       exit 42   AP-002  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalCycleCompleted        exit 43   AP-003  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalTemplateNotInCompany  exit 44   AP-004  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalAlreadyExists         exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   EmployeeNotFound               exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   AppraisalTemplateNotFound      exit 4    TP-901  the runtime's, when no appraisal-template has that id, carrying id; from blueprint/things/appraisal-template/thing.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisalCycle.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/appraisal/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal/verbs/create.ts: p95 300ms.
 *
 * The appraisal's machine, from blueprint/things/appraisal/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *   ▶ (creates)  create    draft      AppraisalCreated
 *     draft      rate      draft      AppraisalRated
 *     draft      selfRate  draft      AppraisalSelfRated
 *     draft      submit    submitted  AppraisalSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisalCycle.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the appraisalCycle and hands it in as refs.appraisalCycle;
 *   before it runs, it reads the appraisalTemplate and hands it in as refs.appraisalTemplate, refusing AppraisalTemplateNotFound if there is none;
 *   before it runs, it mints the appraisal's new id and hands it in as id;
 *   each step is its own span: appraisal.create.load, appraisal.create.insert;
 *   once it answers, it sets the appraisal's state to draft;
 *   once it answers, it writes AppraisalCreated: appraisal from the answer, employee and appraisalCycle from the payload;
 *   the call is the span appraisal.create, and its commit appraisal.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AppraisedEmployeeNotInCompany: exit 41, AP-001.
    if (yield* Handlers.blank<boolean>("refuse AppraisedEmployeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisedEmployeeNotInCompany was refused"));
      return yield* new AppraisedEmployeeNotInCompany({});
    }

    // AppraisedEmployeeHasLeft: exit 42, AP-002.
    if (yield* Handlers.blank<boolean>("refuse AppraisedEmployeeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisedEmployeeHasLeft was refused"));
      return yield* new AppraisedEmployeeHasLeft({});
    }

    // AppraisalCycleCompleted: exit 43, AP-003.
    if (yield* Handlers.blank<boolean>("refuse AppraisalCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisalCycleCompleted was refused"));
      return yield* new AppraisalCycleCompleted({});
    }

    // AppraisalTemplateNotInCompany: exit 44, AP-004.
    if (yield* Handlers.blank<boolean>("refuse AppraisalTemplateNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisalTemplateNotInCompany was refused"));
      return yield* new AppraisalTemplateNotInCompany({});
    }

    // Step insert: database, span appraisal.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // AppraisalCreated needs appraisal, and only the answer can give it.
      appraisal: id,
    };
  });

export default create;
