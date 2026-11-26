// Scaffolded from blueprint/things/appraisal-cycle/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-cycle/create.handler.ts";
import { AppraisalCycle } from "../../blueprint/things/appraisal-cycle/thing.ts";
import { AppraisalTemplate } from "../../blueprint/things/appraisal-template/thing.ts";
import { Employee } from "../../blueprint/things/employee/thing.ts";

const { CycleEndsBeforeStart, AppraiseeNotInCompany, AppraiseeHasLeft, AppraiseeTemplateNotInCompany, AppraiseeListedTwice } = Errors.declared;

/**
 * appraisal-cycle.create: Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-cycle/verbs/create.ts:
 *   company              appraisal-cycle.company
 *   cycleName            appraisal-cycle.cycleName
 *   startDate            appraisal-cycle.startDate
 *   endDate              appraisal-cycle.endDate
 *   kraEvaluationMethod  appraisal-cycle.kraEvaluationMethod
 *   appraisees           appraisal-cycle.appraisees
 *
 * Answer, from blueprint/things/appraisal-cycle/verbs/create.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Refusals:
 *   CycleEndsBeforeStart           exit 41   CY-001  yours to refuse below, carrying startDate; from blueprint/things/appraisal-cycle/errors.ts
 *   AppraiseeNotInCompany          exit 42   CY-002  yours to refuse below; from blueprint/things/appraisal-cycle/errors.ts
 *   AppraiseeHasLeft               exit 43   CY-003  yours to refuse below; from blueprint/things/appraisal-cycle/errors.ts
 *   AppraiseeTemplateNotInCompany  exit 44   CY-004  yours to refuse below; from blueprint/things/appraisal-cycle/errors.ts
 *   AppraiseeListedTwice           exit 45   CY-005  yours to refuse below; from blueprint/things/appraisal-cycle/errors.ts
 *   CycleNameTaken                 exit 48   CY-008  the runtime's: another appraisal cycle holds this company and cycle name (appraisal-cycle.oneNamePerCompany); from blueprint/things/appraisal-cycle/invariants.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-cycle/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-cycle/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-cycle/verbs/create.ts: p95 300ms.
 *
 * The appraisal-cycle's machine, from blueprint/things/appraisal-cycle/machine.ts (▶ marks this call):
 *     from        move      to          emits
 *   ▶ (creates)   create    notStarted  AppraisalCycleCreated
 *     notStarted  start     inProgress  AppraisalCycleStarted
 *     inProgress  complete  completed   AppraisalCycleCompleted
 *     completed   reopen    inProgress  AppraisalCycleReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the appraisal-cycle's new id and hands it in as id;
 *   each step is its own span: appraisal-cycle.create.load, appraisal-cycle.create.insert;
 *   once it answers, it sets the appraisal-cycle's state to notStarted;
 *   once it answers, it writes AppraisalCycleCreated: appraisalCycle from the answer, company from the payload;
 *   the call is the span appraisal-cycle.create, and its commit appraisal-cycle.create.commit.
 */
const create: Handler = ({ company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span appraisal-cycle.create.load. Each row's employee and template, to see whose they are.
    const { people, templates } = yield* steps.load(
      Effect.all({
        people: Effect.forEach(appraisees, (row) => records.find(Employee, row.employee)),
        templates: Effect.forEach(appraisees, (row) => records.find(AppraisalTemplate, row.appraisalTemplate)),
      }),
    );

    // Refusal order (errors.ts), each judged over every row before the next.
    // CycleEndsBeforeStart: exit 41, CY-001. Days are YYYY-MM-DD, so they compare as text; one day is a cycle.
    if (endDate < startDate) {
      yield* Effect.logInfo("the cycle ends before it starts");
      return yield* new CycleEndsBeforeStart({ startDate });
    }

    // AppraiseeNotInCompany: exit 42, CY-002. An employee that doesn't exist is refused the same way.
    if (people.some((person) => person?.["company"] !== company)) {
      yield* Effect.logInfo("an appraisee doesn't work for the cycle's company");
      return yield* new AppraiseeNotInCompany({});
    }

    // AppraiseeHasLeft: exit 43, CY-003. A leaver is in no new cycle (CX-expense-leavers).
    if (people.some((person) => person?.state !== "active")) {
      yield* Effect.logInfo("an appraisee has left");
      return yield* new AppraiseeHasLeft({});
    }

    // AppraiseeTemplateNotInCompany: exit 44, CY-004. A template that doesn't exist is refused the same way.
    if (templates.some((template) => template?.["company"] !== company)) {
      yield* Effect.logInfo("an appraisee's template isn't the company's");
      return yield* new AppraiseeTemplateNotInCompany({});
    }

    // AppraiseeListedTwice: exit 45, CY-005.
    if (new Set(appraisees.map((row) => row.employee)).size !== appraisees.length) {
      yield* Effect.logInfo("an employee is listed twice");
      return yield* new AppraiseeListedTwice({});
    }

    // Step insert: database, span appraisal-cycle.create.insert. A name the company already has is the runtime's
    // refusal (oneNamePerCompany).
    yield* steps.insert(records.insert(AppraisalCycle, { id, company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees }));

    // The move create, to notStarted.
    yield* move();

    return {
      // AppraisalCycleCreated needs appraisalCycle, and only the answer can give it.
      appraisalCycle: id,
    };
  });

export default create;
