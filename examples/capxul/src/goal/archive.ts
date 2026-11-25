// Scaffolded from blueprint/things/goal/verbs/archive.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/goal/archive.handler.ts";
import { AppraisalCycle } from "../../blueprint/things/appraisal-cycle/thing.ts";
import { follow } from "../goal-tree.ts";

const { GoalCycleCompleted, GoalIsGroup } = Errors.declared;

/**
 * goal.archive: Archive a goal: it no longer counts towards its parent or its appraisal.
 *
 * Who may call:
 *   the self of its goal.employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its goal.company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/archive.ts:
 *   goal  goal.id
 *
 * Answer, from blueprint/things/goal/verbs/archive.ts:
 *   goal  goal.id
 *
 * Refusals:
 *   GoalCycleCompleted      exit 41   GO-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalIsGroup             exit 47   GO-007  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   GoalNotPending          exit 40   GO-900  the runtime's, when the goal isn't in pending or inProgress or closed, carrying state; from blueprint/things/goal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the self of its goal.employee, or the owner of its goal.company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/goal/verbs/archive.ts
 *
 * Idempotent by request, from blueprint/things/goal/verbs/archive.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/goal/verbs/archive.ts: p95 400ms.
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
 *   ▶ pending     archive         archived    GoalArchived
 *   ▶ inProgress  archive         archived    GoalArchived
 *   ▶ closed      archive         archived    GoalArchived
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
 *   before it runs, it refuses GoalNotPending unless the goal is in pending or inProgress or closed;
 *   before it runs, it hands in the goal it read as subject, so this handler never reads it again;
 *   each step is its own span: goal.archive.load, goal.archive.update;
 *   once it answers, it sets the goal's state to archived;
 *   once it answers, it writes GoalArchived: goal from the answer;
 *   the call is the span goal.archive, and its commit goal.archive.commit.
 */
const archive: Handler = ({ goal }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span goal.archive.load. The runtime read the goal; its cycle is read here.
    if (!subject) return yield* Effect.die(new Error(`goal ${goal} was read and then not found`));
    const employee = subject["employee"] as string;
    const appraisalCycle = subject["appraisalCycle"] as string;
    const cycle = yield* steps.load(records.find(AppraisalCycle, appraisalCycle));

    // GoalCycleCompleted: exit 41, GO-001. A completed cycle's goals don't move.
    if (cycle?.state === "completed") {
      yield* Effect.logInfo("the goal's cycle is completed");
      return yield* new GoalCycleCompleted({});
    }

    // GoalIsGroup: exit 47, GO-007. A group's status follows its children, through goal.roll-up.
    if (subject["isGroup"] === true) {
      yield* Effect.logInfo("the goal is a group, whose status follows its children");
      return yield* new GoalIsGroup({});
    }

    // Step update: database, in the store goal, appraisal, span goal.archive.update. An archived goal counts in no
    // group or score; the groups above and the appraisal follow.
    const progress = subject["progress"] as BigDecimal.BigDecimal;
    const state = "archived";
    yield* steps.update(
      Effect.gen(function* () {
        yield* follow(employee, appraisalCycle, { id: goal, progress, state });
      }),
    );

    // The move archive, to archived.
    yield* move();

    return { goal };
  });

export default archive;
