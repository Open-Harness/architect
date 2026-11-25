// Scaffolded from blueprint/things/goal/verbs/complete.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/goal/complete.handler.ts";

const { GoalCycleCompleted, GoalIsGroup } = Errors.declared;

/**
 * goal.complete: Mark a goal completed, setting its progress to 100.
 *
 * Who may call:
 *   the self of its goal.employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its goal.company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/complete.ts:
 *   goal  goal.id
 *
 * Answer, from blueprint/things/goal/verbs/complete.ts:
 *   goal  goal.id
 *
 * Refusals:
 *   GoalCycleCompleted      exit 41   GL-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalIsGroup             exit 47   GL-009  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   GoalNotPending          exit 40   GL-900  the runtime's, when the goal isn't in pending or inProgress, carrying state; from blueprint/things/goal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the self of its goal.employee, or the owner of its goal.company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/goal/verbs/complete.ts
 *
 * Idempotent by request, from blueprint/things/goal/verbs/complete.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/goal/verbs/complete.ts: p95 400ms.
 *
 * The goal's machine, from blueprint/things/goal/machine.ts (▶ marks this call):
 *     from        move            to          emits
 *     (creates)   create          pending     GoalCreated
 *     (creates)   create          inProgress  GoalCreated
 *     (creates)   create          completed   GoalCreated
 *     pending     updateProgress  pending     GoalProgressUpdated
 *     pending     updateProgress  inProgress  GoalProgressUpdated
 *     pending     updateProgress  completed   GoalProgressUpdated
 *     inProgress  updateProgress  pending     GoalProgressUpdated
 *     inProgress  updateProgress  inProgress  GoalProgressUpdated
 *     inProgress  updateProgress  completed   GoalProgressUpdated
 *     completed   updateProgress  pending     GoalProgressUpdated
 *     completed   updateProgress  inProgress  GoalProgressUpdated
 *     completed   updateProgress  completed   GoalProgressUpdated
 *   ▶ pending     complete        completed   GoalCompleted
 *   ▶ inProgress  complete        completed   GoalCompleted
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
 *   before it runs, it refuses NotAllowed unless the caller is the self of its goal.employee, or the owner of its goal.company;
 *   before it runs, it refuses GoalNotPending unless the goal is in pending or inProgress;
 *   before it runs, it hands in the goal it read as subject, so this handler never reads it again;
 *   each step is its own span: goal.complete.load, goal.complete.update;
 *   once it answers, it sets the goal's state to completed;
 *   once it answers, it writes GoalCompleted: goal from the answer;
 *   the call is the span goal.complete, and its commit goal.complete.commit.
 */
const complete: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span goal.complete.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // GoalCycleCompleted: exit 41, GL-001.
    if (yield* Handlers.blank<boolean>("refuse GoalCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalCycleCompleted was refused"));
      return yield* new GoalCycleCompleted({});
    }

    // GoalIsGroup: exit 47, GL-009.
    if (yield* Handlers.blank<boolean>("refuse GoalIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why GoalIsGroup was refused"));
      return yield* new GoalIsGroup({});
    }

    // Step update: database, in the store goal, appraisal, span goal.complete.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move complete, from pending or inProgress, to completed.
    yield* move();

    return {
      goal: yield* Handlers.blank("goal, a goal.id"),
    };
  });

export default complete;
