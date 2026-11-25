// Scaffolded from blueprint/things/appraisal-cycle/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-cycle/start.handler.ts";
import { Appraisal } from "../../blueprint/things/appraisal/thing.ts";
import { oneAppraisalPerCycle } from "../../blueprint/things/appraisal/invariants.ts";
import { AppraisalTemplate } from "../../blueprint/things/appraisal-template/thing.ts";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { draftFrom } from "../appraisal-math.ts";

const { CycleWithoutAppraisees } = Errors.declared;

/**
 * appraisal-cycle.start: Start a cycle, making an appraisal for each appraisee who has none yet.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisalCycle.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-cycle/verbs/start.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Answer, from blueprint/things/appraisal-cycle/verbs/start.ts:
 *   appraisalCycle  appraisal-cycle.id
 *   appraisals      AppraisalIds
 *
 * Refusals:
 *   CycleWithoutAppraisees       exit 46   CY-006  yours to refuse below; from blueprint/things/appraisal-cycle/errors.ts
 *   AppraisalAlreadyExists       exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   CycleNameTaken               exit 48   CY-008  the runtime's: another appraisal cycle holds this company and cycle name (appraisal-cycle.oneNamePerCompany); from blueprint/things/appraisal-cycle/invariants.ts
 *   AppraisalCycleNotNotStarted  exit 40   CY-900  the runtime's, when the appraisal-cycle isn't in notStarted, carrying state; from blueprint/things/appraisal-cycle/machine.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisalCycle.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-cycle/verbs/start.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-cycle/verbs/start.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-cycle/verbs/start.ts: p95 500ms.
 *
 * The appraisal-cycle's machine, from blueprint/things/appraisal-cycle/machine.ts (▶ marks this call):
 *     from        move      to          emits
 *     (creates)   create    notStarted  AppraisalCycleCreated
 *   ▶ notStarted  start     inProgress  AppraisalCycleStarted
 *     inProgress  complete  completed   AppraisalCycleCompleted
 *     completed   reopen    inProgress  AppraisalCycleReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisalCycle.company;
 *   before it runs, it refuses AppraisalCycleNotNotStarted unless the appraisal-cycle is in notStarted;
 *   before it runs, it hands in the appraisal-cycle it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal-cycle.start.load, appraisal-cycle.start.create;
 *   once it answers, it sets the appraisal-cycle's state to inProgress;
 *   once it answers, it writes AppraisalCycleStarted: appraisalCycle from the answer;
 *   the call is the span appraisal-cycle.start, and its commit appraisal-cycle.start.commit.
 */
const start: Handler = ({ appraisalCycle }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span appraisal-cycle.start.load. The runtime read the cycle; each row's employee, template
    // and any appraisal it already has are read here.
    const rows = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`appraisal cycle ${appraisalCycle} was read and then not found`));
        const appraisees = subject["appraisees"] as ReadonlyArray<{ readonly employee: string; readonly appraisalTemplate: string }>;
        return yield* Effect.forEach(appraisees, (row) =>
          Effect.all({
            employee: Effect.succeed(row.employee),
            person: records.find(Employee, row.employee),
            template: records.find(AppraisalTemplate, row.appraisalTemplate),
            held: records.findBy(oneAppraisalPerCycle, { employee: row.employee, appraisalCycle } as never),
          }),
        );
      }),
    );

    // CycleWithoutAppraisees: exit 46, CY-006. HRMS's Create Appraisals: "Please select employees to create appraisals for".
    if (rows.length === 0) {
      yield* Effect.logInfo("the cycle lists no appraisees");
      return yield* new CycleWithoutAppraisees({});
    }

    // Step create: database, in the store appraisal-cycle, appraisal, span appraisal-cycle.start.create. One draft
    // appraisal per row, by the row's own template, skipping an employee who already has one (HRMS skips the duplicate)
    // or has left (CX-expense-leavers). The method is the cycle's.
    const company = subject!["company"] as string;
    const kraEvaluationMethod = subject!["kraEvaluationMethod"] as string;
    const appraisals = yield* steps.create(
      Effect.gen(function* () {
        const made: Array<string> = [];
        for (const { employee, person, template, held } of rows) {
          if (held || !template || person?.state !== "active") continue;
          const id = yield* Ids.of(Appraisal.fields.id);
          yield* records.insert(
            Appraisal,
            { id, company, employee, appraisalCycle, appraisalTemplate: template["id"], kraEvaluationMethod, ...draftFrom(template) } as never,
            "draft",
          );
          made.push(id);
        }
        return made;
      }),
    );

    // The move start, from notStarted, to inProgress.
    yield* move();

    return { appraisalCycle, appraisals: appraisals as never };
  });

export default start;
