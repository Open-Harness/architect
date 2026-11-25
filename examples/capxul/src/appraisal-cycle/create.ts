// Scaffolded from blueprint/things/appraisal-cycle/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-cycle/create.handler.ts";

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
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal-cycle.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // CycleEndsBeforeStart: exit 41, CY-001.
    if (yield* Handlers.blank<boolean>("refuse CycleEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why CycleEndsBeforeStart was refused"));
      return yield* new CycleEndsBeforeStart({
        startDate: yield* Handlers.blank("CycleEndsBeforeStart.startDate, a Day"),
      });
    }

    // AppraiseeNotInCompany: exit 42, CY-002.
    if (yield* Handlers.blank<boolean>("refuse AppraiseeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraiseeNotInCompany was refused"));
      return yield* new AppraiseeNotInCompany({});
    }

    // AppraiseeHasLeft: exit 43, CY-003.
    if (yield* Handlers.blank<boolean>("refuse AppraiseeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraiseeHasLeft was refused"));
      return yield* new AppraiseeHasLeft({});
    }

    // AppraiseeTemplateNotInCompany: exit 44, CY-004.
    if (yield* Handlers.blank<boolean>("refuse AppraiseeTemplateNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraiseeTemplateNotInCompany was refused"));
      return yield* new AppraiseeTemplateNotInCompany({});
    }

    // AppraiseeListedTwice: exit 45, CY-005.
    if (yield* Handlers.blank<boolean>("refuse AppraiseeListedTwice when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraiseeListedTwice was refused"));
      return yield* new AppraiseeListedTwice({});
    }

    // Step insert: database, span appraisal-cycle.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to notStarted.
    yield* move();

    return {
      // AppraisalCycleCreated needs appraisalCycle, and only the answer can give it.
      appraisalCycle: id,
    };
  });

export default create;
