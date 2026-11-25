// Scaffolded from blueprint/things/goal/verbs/create.ts. Yours from now on.
import { Effect, Match } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/goal/create.handler.ts";

const { GoalCycleCompleted, GoalEmployeeNotInCompany, GoalOwnerHasLeft, GoalKraNotInAppraisal, ParentGoalMismatch, ProgressOutOfRange, ParentGoalNotGroup } = Errors.declared;

/**
 * goal.create: Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.
 *
 * Who may call:
 *   the self of its employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/create.ts:
 *   company         goal.company
 *   employee        goal.employee
 *   appraisalCycle  goal.appraisalCycle
 *   kra             goal.kra
 *   goalName        goal.goalName
 *   progress        goal.progress
 *   isGroup         goal.isGroup
 *   parentGoal      goal.parentGoal (optional)
 *
 * Answer, from blueprint/things/goal/verbs/create.ts:
 *   goal  goal.id
 *
 * Refusals:
 *   GoalCycleCompleted        exit 41   GL-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalEmployeeNotInCompany  exit 42   GL-002  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalOwnerHasLeft          exit 43   GL-003  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalKraNotInAppraisal     exit 44   GL-004  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ParentGoalMismatch        exit 45   GL-005  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ProgressOutOfRange        exit 46   GL-006  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ParentGoalNotGroup        exit 48   GL-010  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists    exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   CompanyNotFound           exit 4    CO-901  the runtime's, when no company has that id, carrying id; from blueprint/things/company/thing.ts
 *   EmployeeNotFound          exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   AppraisalCycleNotFound    exit 4    CY-901  the runtime's, when no appraisal-cycle has that id, carrying id; from blueprint/things/appraisal-cycle/thing.ts
 *   KraNotFound               exit 4    KR-901  the runtime's, when no kra has that id, carrying id; from blueprint/things/kra/thing.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the self of its employee, or the owner of its company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/goal/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/goal/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/goal/verbs/create.ts: p95 400ms.
 *
 * The goal's machine, from blueprint/things/goal/machine.ts (▶ marks this call):
 *     from        move            to          emits
 *   ▶ (creates)   create          pending     GoalCreated
 *   ▶ (creates)   create          inProgress  GoalCreated
 *   ▶ (creates)   create          completed   GoalCreated
 *     pending     updateProgress  pending     GoalProgressUpdated
 *     pending     updateProgress  inProgress  GoalProgressUpdated
 *     pending     updateProgress  completed   GoalProgressUpdated
 *     inProgress  updateProgress  pending     GoalProgressUpdated
 *     inProgress  updateProgress  inProgress  GoalProgressUpdated
 *     inProgress  updateProgress  completed   GoalProgressUpdated
 *     completed   updateProgress  pending     GoalProgressUpdated
 *     completed   updateProgress  inProgress  GoalProgressUpdated
 *     completed   updateProgress  completed   GoalProgressUpdated
 *     pending     complete        completed   GoalCompleted
 *     inProgress  complete        completed   GoalCompleted
 *     pending     archive         archived    GoalArchived
 *     inProgress  archive         archived    GoalArchived
 *     closed      archive         archived    GoalArchived
 *     pending     close           closed      GoalClosed
 *     inProgress  close           closed      GoalClosed
 *     archived    close           closed      GoalClosed
 *     archived    unarchive       pending     GoalUnarchived
 *     archived    unarchive       inProgress  GoalUnarchived
 *     archived    unarchive       completed   GoalUnarchived
 *     closed      reopen          pending     GoalReopened
 *     closed      reopen          inProgress  GoalReopened
 *     closed      reopen          completed   GoalReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employee, or the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company, refusing CompanyNotFound if there is none;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the appraisalCycle and hands it in as refs.appraisalCycle, refusing AppraisalCycleNotFound if there is none;
 *   before it runs, it reads the kra and hands it in as refs.kra, refusing KraNotFound if there is none;
 *   before it runs, it reads the parentGoal and hands it in as refs.parentGoal;
 *   before it runs, it mints the goal's new id and hands it in as id;
 *   each step is its own span: goal.create.load, goal.create.insert;
 *   once it answers, it sets the goal's state to the outcome given to move;
 *   once it answers, it writes GoalCreated: goal from the answer, employee, kra and progress from the payload;
 *   the call is the span goal.create, and its commit goal.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span goal.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // GoalCycleCompleted: exit 41, GL-001.
    if (yield* Handlers.blank<boolean>("refuse GoalCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalCycleCompleted was refused"));
      return yield* new GoalCycleCompleted({});
    }

    // GoalEmployeeNotInCompany: exit 42, GL-002.
    if (yield* Handlers.blank<boolean>("refuse GoalEmployeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalEmployeeNotInCompany was refused"));
      return yield* new GoalEmployeeNotInCompany({});
    }

    // GoalOwnerHasLeft: exit 43, GL-003.
    if (yield* Handlers.blank<boolean>("refuse GoalOwnerHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalOwnerHasLeft was refused"));
      return yield* new GoalOwnerHasLeft({});
    }

    // GoalKraNotInAppraisal: exit 44, GL-004.
    if (yield* Handlers.blank<boolean>("refuse GoalKraNotInAppraisal when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalKraNotInAppraisal was refused"));
      return yield* new GoalKraNotInAppraisal({});
    }

    // ParentGoalMismatch: exit 45, GL-005.
    if (yield* Handlers.blank<boolean>("refuse ParentGoalMismatch when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ParentGoalMismatch was refused"));
      return yield* new ParentGoalMismatch({});
    }

    // ProgressOutOfRange: exit 46, GL-006.
    if (yield* Handlers.blank<boolean>("refuse ProgressOutOfRange when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ProgressOutOfRange was refused"));
      return yield* new ProgressOutOfRange({});
    }

    // ParentGoalNotGroup: exit 48, GL-010.
    if (yield* Handlers.blank<boolean>("refuse ParentGoalNotGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ParentGoalNotGroup was refused"));
      return yield* new ParentGoalNotGroup({});
    }

    // Step insert: database, in the store goal, appraisal, span goal.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome = yield* Handlers.blank<Outcome>("where create ends: pending or inProgress or completed");
    yield* Match.value(outcome).pipe(
      // To pending. From there the goal can: updateProgress (to pending or inProgress or completed), complete (to completed), archive (to archived), close (to closed).
      Match.when("pending", () => move("pending")),
      // To inProgress. From there the goal can: updateProgress (to pending or inProgress or completed), complete (to completed), archive (to archived), close (to closed).
      Match.when("inProgress", () => move("inProgress")),
      // To completed. From there the goal can: updateProgress (to pending or inProgress or completed).
      Match.when("completed", () => move("completed")),
      Match.exhaustive,
    );

    return {
      // GoalCreated needs goal, and only the answer can give it.
      goal: id,
    };
  });

export default create;
