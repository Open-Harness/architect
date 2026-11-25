// Scaffolded from blueprint/things/goal/verbs/create.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/goal/create.handler.ts";
import { Goal } from "../../blueprint/things/goal/thing.ts";
import { oneAppraisalPerCycle } from "../../blueprint/things/appraisal/invariants.ts";
import { inPercent, statusOf, ZERO, type KraLine } from "../appraisal-math.ts";
import { follow } from "../goal-tree.ts";

const { GoalCycleCompleted, GoalEmployeeNotInCompany, GoalOwnerHasLeft, GoalKraNotInAppraisal, ParentGoalMismatch, ProgressOutOfRange, ParentGoalNotGroup } = Errors.declared;

/**
 * goal.create: Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.
 *
 * Who may call:
 *   the self of its employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its appraisalCycle.company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/goal/verbs/create.ts:
 *   employee        goal.employee
 *   appraisalCycle  goal.appraisalCycle
 *   kra             goal.kra
 *   goalName        goal.goalName
 *   progress        goal.progress
 *   isGroup         goal.isGroup
 *   parentGoal      goal.parentGoal (optional)
 *
 * Answer, from blueprint/things/goal/verbs/create.ts:
 *   goal            goal.id
 *   appraisal       appraisal.id
 *   appraisalCycle  goal.appraisalCycle
 *
 * Refusals:
 *   GoalCycleCompleted        exit 41   GO-001  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalEmployeeNotInCompany  exit 42   GO-002  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalOwnerHasLeft          exit 43   GO-003  yours to refuse below; from blueprint/things/goal/errors.ts
 *   GoalKraNotInAppraisal     exit 44   GO-004  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ParentGoalMismatch        exit 45   GO-005  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ProgressOutOfRange        exit 46   GO-006  yours to refuse below; from blueprint/things/goal/errors.ts
 *   ParentGoalNotGroup        exit 48   GO-009  yours to refuse below; from blueprint/things/goal/errors.ts
 *   AppraisalAlreadyExists    exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   EmployeeNotFound          exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   AppraisalCycleNotFound    exit 4    CY-901  the runtime's, when no appraisal-cycle has that id, carrying id; from blueprint/things/appraisal-cycle/thing.ts
 *   KraNotFound               exit 4    KR-901  the runtime's, when no kra has that id, carrying id; from blueprint/things/kra/thing.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the self of its employee, or the owner of its appraisalCycle.company; from blueprint/things/employee/roles.ts
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
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employee, or the owner of its appraisalCycle.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the appraisalCycle and hands it in as refs.appraisalCycle, refusing AppraisalCycleNotFound if there is none;
 *   before it runs, it reads the kra and hands it in as refs.kra, refusing KraNotFound if there is none;
 *   before it runs, it reads the parentGoal and hands it in as refs.parentGoal;
 *   before it runs, it mints the goal's new id and hands it in as id;
 *   each step is its own span: goal.create.load, goal.create.insert;
 *   once it answers, it sets the goal's state to the outcome given to move;
 *   once it answers, it writes GoalCreated: goal from the answer, employee and kra from the payload;
 *   the call is the span goal.create, and its commit goal.create.commit.
 */
const create: Handler = ({ employee, appraisalCycle, kra, goalName, progress, isGroup, parentGoal }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span goal.create.load. The runtime read the employee, the cycle, the KRA and the parent;
    // the employee's appraisal in the cycle is read here, since the goal's KRA must be one of its lines.
    const { person, cycle, parent, appraisal } = yield* steps.load(
      Effect.all({
        person: Effect.succeed(refs.employee),
        cycle: Effect.succeed(refs.appraisalCycle),
        parent: Effect.succeed(refs.parentGoal),
        appraisal: records.findBy(oneAppraisalPerCycle, { employee, appraisalCycle } as never),
      }),
    );
    if (!person || !cycle) return yield* Effect.die(new Error(`goal ${id}'s employee or cycle was read and then not found`));
    const company = cycle["company"] as string;

    // Refusal order (errors.ts). GoalCycleCompleted: exit 41, GO-001. A completed cycle takes no new goal.
    if (cycle.state === "completed") {
      yield* Effect.logInfo("the cycle is completed");
      return yield* new GoalCycleCompleted({});
    }

    // GoalEmployeeNotInCompany: exit 42, GO-002. The goal takes the cycle's company.
    if (person["company"] !== company) {
      yield* Effect.logInfo("the employee doesn't work for the cycle's company");
      return yield* new GoalEmployeeNotInCompany({});
    }

    // GoalOwnerHasLeft: exit 43, GO-003. CX-expense-leavers.
    if (person.state !== "active") {
      yield* Effect.logInfo("the employee has left");
      return yield* new GoalOwnerHasLeft({});
    }

    // GoalKraNotInAppraisal: exit 44, GO-004. The employee has an appraisal in the cycle with this KRA on it; before
    // the cycle starts there is none.
    if (!appraisal || !(appraisal["kras"] as ReadonlyArray<KraLine>).some((line) => line.kra === kra)) {
      yield* Effect.logInfo("the KRA isn't on the employee's appraisal in the cycle");
      return yield* new GoalKraNotInAppraisal({});
    }

    // ParentGoalMismatch: exit 45, GO-005. HRMS's validate_parent_fields; a parent that doesn't exist is refused the same way.
    if (parentGoal !== undefined && (parent?.["employee"] !== employee || parent["kra"] !== kra || parent["appraisalCycle"] !== appraisalCycle)) {
      yield* Effect.logInfo("the parent goal isn't in the same employee's tree, KRA and cycle");
      return yield* new ParentGoalMismatch({});
    }

    // ProgressOutOfRange: exit 46, GO-006. HRMS's validate_progress; below 0 is Capxul's.
    if (!inPercent(progress)) {
      yield* Effect.logInfo("the progress isn't between 0 and 100");
      return yield* new ProgressOutOfRange({});
    }

    // ParentGoalNotGroup: exit 48, GO-009. Frappe's validate_ledger.
    if (parent && parent["isGroup"] !== true) {
      yield* Effect.logInfo("the parent goal isn't a group");
      return yield* new ParentGoalNotGroup({});
    }

    // Step insert: database, in the store goal, appraisal, span goal.create.insert. A group starts empty, so at 0;
    // its progress follows its children. The groups above take the new average, and the appraisal its scores.
    const own: BigDecimal.BigDecimal = isGroup ? ZERO : progress;
    const state = statusOf(own);
    const scored = yield* steps.insert(
      Effect.gen(function* () {
        yield* records.insert(Goal, { id, company, employee, appraisalCycle, kra, goalName, progress: own, isGroup, ...(parentGoal === undefined ? {} : { parentGoal }) } as never);
        return yield* follow(employee, appraisalCycle, { id, progress: own, state });
      }),
    );
    if (!scored) return yield* Effect.die(new Error(`goal ${id}'s appraisal was read and then not found`));

    // The move create, to where its progress puts it.
    yield* move(state);

    return {
      // GoalCreated needs goal, and only the answer can give it.
      goal: id,
      appraisal: scored as never,
      appraisalCycle,
    };
  });

export default create;
