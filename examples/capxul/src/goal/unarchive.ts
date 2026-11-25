// Scaffolded from blueprint/things/goal/verbs/unarchive.ts. Yours from now on.
import { Effect, Match } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler, Outcome } from "../../generated/api/src/goal/unarchive.handler.ts";

const { GoalCycleCompleted } = Errors.declared;

/**
 * goal.unarchive: Bring an archived goal back: its status follows its progress again.
 *
 * Who may call:
 *   the self of its goal.employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its goal.company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/unarchive.ts:
 *   goal  goal.id
 *
 * Answer, from blueprint/things/goal/verbs/unarchive.ts:
 *   goal  goal.id
 *
 * Refusals:
 *   GoalCycleCompleted      exit 41   GL-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   GoalNotPending          exit 40   GL-900  the runtime's, when the goal isn't in archived, carrying state; from blueprint/things/goal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the self of its goal.employee, or the owner of its goal.company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/goal/verbs/unarchive.ts
 *
 * Idempotent by request, from blueprint/things/goal/verbs/unarchive.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/goal/verbs/unarchive.ts: p95 400ms.
 *
 * The goal's machine, from blueprint/things/goal/machine.ts (▶ marks this call):
 *     from        move            to          emits
 *     (creates)   create          pending     GoalCreated
 *     (creates)   create          inProgress  GoalCreated
 *     (creates)   create          completed   GoalCreated
 *     pending     updateProgress  pending     GoalProgressUpdated
 *     pending     updateProgress  inProgress  GoalProgressUpdated
 *     pending     updateProgress  completed   GoalProgressUpdated
 *     pending     updateProgress  archived    GoalProgressUpdated
 *     pending     updateProgress  closed      GoalProgressUpdated
 *     inProgress  updateProgress  pending     GoalProgressUpdated
 *     inProgress  updateProgress  inProgress  GoalProgressUpdated
 *     inProgress  updateProgress  completed   GoalProgressUpdated
 *     inProgress  updateProgress  archived    GoalProgressUpdated
 *     inProgress  updateProgress  closed      GoalProgressUpdated
 *     completed   updateProgress  pending     GoalProgressUpdated
 *     completed   updateProgress  inProgress  GoalProgressUpdated
 *     completed   updateProgress  completed   GoalProgressUpdated
 *     completed   updateProgress  archived    GoalProgressUpdated
 *     completed   updateProgress  closed      GoalProgressUpdated
 *     archived    updateProgress  pending     GoalProgressUpdated
 *     archived    updateProgress  inProgress  GoalProgressUpdated
 *     archived    updateProgress  completed   GoalProgressUpdated
 *     archived    updateProgress  archived    GoalProgressUpdated
 *     archived    updateProgress  closed      GoalProgressUpdated
 *     closed      updateProgress  pending     GoalProgressUpdated
 *     closed      updateProgress  inProgress  GoalProgressUpdated
 *     closed      updateProgress  completed   GoalProgressUpdated
 *     closed      updateProgress  archived    GoalProgressUpdated
 *     closed      updateProgress  closed      GoalProgressUpdated
 *     pending     complete        completed   GoalCompleted
 *     inProgress  complete        completed   GoalCompleted
 *     pending     archive         archived    GoalArchived
 *     inProgress  archive         archived    GoalArchived
 *     closed      archive         archived    GoalArchived
 *     pending     close           closed      GoalClosed
 *     inProgress  close           closed      GoalClosed
 *     archived    close           closed      GoalClosed
 *   ▶ archived    unarchive       pending     GoalUnarchived
 *   ▶ archived    unarchive       inProgress  GoalUnarchived
 *   ▶ archived    unarchive       completed   GoalUnarchived
 *     closed      reopen          pending     GoalReopened
 *     closed      reopen          inProgress  GoalReopened
 *     closed      reopen          completed   GoalReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its goal.employee, or the owner of its goal.company;
 *   before it runs, it refuses GoalNotPending unless the goal is in archived;
 *   before it runs, it hands in the goal it read as subject, so this handler never reads it again;
 *   each step is its own span: goal.unarchive.load, goal.unarchive.update;
 *   once it answers, it sets the goal's state to the outcome given to move;
 *   once it answers, it writes GoalUnarchived: goal from the answer;
 *   the call is the span goal.unarchive, and its commit goal.unarchive.commit.
 */
const unarchive: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span goal.unarchive.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // GoalCycleCompleted: exit 41, GL-001.
    if (yield* Handlers.blank<boolean>("refuse GoalCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalCycleCompleted was refused"));
      return yield* new GoalCycleCompleted({});
    }

    // Step update: database, in the store goal, appraisal, span goal.unarchive.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move unarchive, from archived: one branch per outcome. A new outcome won't compile until it has its branch.
    const outcome = yield* Handlers.blank<Outcome>("where unarchive ends: pending or inProgress or completed");
    yield* Match.value(outcome).pipe(
      // To pending. From there the goal can: updateProgress (to pending or inProgress or completed or archived or closed), complete (to completed), archive (to archived), close (to closed).
      Match.when("pending", () => move("pending")),
      // To inProgress. From there the goal can: updateProgress (to pending or inProgress or completed or archived or closed), complete (to completed), archive (to archived), close (to closed).
      Match.when("inProgress", () => move("inProgress")),
      // To completed. From there the goal can: updateProgress (to pending or inProgress or completed or archived or closed).
      Match.when("completed", () => move("completed")),
      Match.exhaustive,
    );

    return {
      goal: yield* Handlers.blank("goal, a goal.id"),
    };
  });

export default unarchive;
