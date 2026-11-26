// Scaffolded from blueprint/things/goal/verbs/update-progress.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/goal/update-progress.handler.ts";
import { Goal } from "../../blueprint/things/goal/thing.ts";
import { AppraisalCycle } from "../../blueprint/things/appraisal-cycle/thing.ts";
import { inPercent, statusOf } from "../appraisal-math.ts";
import { follow } from "../goal-tree.ts";

const { GoalCycleCompleted, GoalIsGroup, ProgressOutOfRange } = Errors.declared;

/**
 * goal.update-progress: Set how far along a goal is, from 0 to 100.
 *
 * Who may call:
 *   the self of its goal.employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its goal.company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/update-progress.ts:
 *   goal      goal.id
 *   progress  goal.progress
 *
 * Answer, from blueprint/things/goal/verbs/update-progress.ts:
 *   goal       goal.id
 *   progress   goal.progress
 *   appraisal  appraisal.id
 *
 * Refusals:
 *   GoalCycleCompleted      exit 41   GO-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalIsGroup             exit 47   GO-007  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ProgressOutOfRange      exit 46   GO-006  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   GoalNotPending          exit 40   GO-900  the runtime's, when the goal isn't in pending or inProgress or completed or archived or closed, carrying state; from blueprint/things/goal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the self of its goal.employee, or the owner of its goal.company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/goal/verbs/update-progress.ts
 *
 * Idempotent by request, from blueprint/things/goal/verbs/update-progress.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/goal/verbs/update-progress.ts: p95 400ms.
 *
 * The goal's machine, from blueprint/things/goal/machine.ts (▶ marks this call):
 *     from        move            to          emits
 *     (creates)   create          pending     GoalCreated
 *     (creates)   create          inProgress  GoalCreated
 *     (creates)   create          completed   GoalCreated
 *   ▶ pending     updateProgress  pending     GoalProgressUpdated
 *   ▶ pending     updateProgress  inProgress  GoalProgressUpdated
 *   ▶ pending     updateProgress  completed   GoalProgressUpdated
 *   ▶ pending     updateProgress  archived    GoalProgressUpdated
 *   ▶ pending     updateProgress  closed      GoalProgressUpdated
 *   ▶ inProgress  updateProgress  pending     GoalProgressUpdated
 *   ▶ inProgress  updateProgress  inProgress  GoalProgressUpdated
 *   ▶ inProgress  updateProgress  completed   GoalProgressUpdated
 *   ▶ inProgress  updateProgress  archived    GoalProgressUpdated
 *   ▶ inProgress  updateProgress  closed      GoalProgressUpdated
 *   ▶ completed   updateProgress  pending     GoalProgressUpdated
 *   ▶ completed   updateProgress  inProgress  GoalProgressUpdated
 *   ▶ completed   updateProgress  completed   GoalProgressUpdated
 *   ▶ completed   updateProgress  archived    GoalProgressUpdated
 *   ▶ completed   updateProgress  closed      GoalProgressUpdated
 *   ▶ archived    updateProgress  pending     GoalProgressUpdated
 *   ▶ archived    updateProgress  inProgress  GoalProgressUpdated
 *   ▶ archived    updateProgress  completed   GoalProgressUpdated
 *   ▶ archived    updateProgress  archived    GoalProgressUpdated
 *   ▶ archived    updateProgress  closed      GoalProgressUpdated
 *   ▶ closed      updateProgress  pending     GoalProgressUpdated
 *   ▶ closed      updateProgress  inProgress  GoalProgressUpdated
 *   ▶ closed      updateProgress  completed   GoalProgressUpdated
 *   ▶ closed      updateProgress  archived    GoalProgressUpdated
 *   ▶ closed      updateProgress  closed      GoalProgressUpdated
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
 *     pending     rollUp          pending     GoalRolledUp
 *     pending     rollUp          inProgress  GoalRolledUp
 *     pending     rollUp          completed   GoalRolledUp
 *     inProgress  rollUp          pending     GoalRolledUp
 *     inProgress  rollUp          inProgress  GoalRolledUp
 *     inProgress  rollUp          completed   GoalRolledUp
 *     completed   rollUp          pending     GoalRolledUp
 *     completed   rollUp          inProgress  GoalRolledUp
 *     completed   rollUp          completed   GoalRolledUp
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its goal.employee, or the owner of its goal.company;
 *   before it runs, it refuses GoalNotPending unless the goal is in pending or inProgress or completed or archived or closed;
 *   before it runs, it hands in the goal it read as subject, so this handler never reads it again;
 *   each step is its own span: goal.update-progress.load, goal.update-progress.update;
 *   once it answers, it sets the goal's state to the outcome given to move;
 *   once it answers, it writes GoalProgressUpdated: goal from the answer;
 *   the call is the span goal.update-progress, and its commit goal.update-progress.commit.
 */
const updateProgress: Handler = ({ goal, progress }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span goal.update-progress.load. The runtime read the goal; its cycle is read here.
    if (!subject) return yield* Effect.die(new Error(`goal ${goal} was read and then not found`));
    const employee = subject["employee"] as string;
    const appraisalCycle = subject["appraisalCycle"] as string;
    const cycle = yield* steps.load(records.find(AppraisalCycle, appraisalCycle));

    // Refusal order (errors.ts). GoalCycleCompleted: exit 41, GO-001.
    if (cycle?.state === "completed") {
      yield* Effect.logInfo("the goal's cycle is completed");
      return yield* new GoalCycleCompleted({});
    }

    // GoalIsGroup: exit 47, GO-007. A group's progress follows its children.
    if (subject["isGroup"] === true) {
      yield* Effect.logInfo("the goal is a group, whose progress follows its children");
      return yield* new GoalIsGroup({});
    }

    // ProgressOutOfRange: exit 46, GO-006.
    if (!inPercent(progress)) {
      yield* Effect.logInfo("the progress isn't between 0 and 100");
      return yield* new ProgressOutOfRange({});
    }

    // Step update: database, in the store goal, appraisal, span goal.update-progress.update. An archived or closed goal
    // keeps its state (HRMS sets status from progress only on an open goal); otherwise its progress gives it.
    const state = subject.state === "archived" || subject.state === "closed" ? subject.state : statusOf(progress);
    const appraisal = yield* steps.update(
      Effect.gen(function* () {
        yield* records.update(Goal, goal, { progress } as never);
        return yield* follow(employee, appraisalCycle, { id: goal, progress, state });
      }),
    );
    if (!appraisal) return yield* Effect.die(new Error(`goal ${goal}'s appraisal was read and then not found`));

    // The move updateProgress, to the state worked out above.
    yield* move(state);

    return { goal, progress, appraisal: appraisal as never };
  });

export default updateProgress;
