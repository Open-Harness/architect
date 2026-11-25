// Scaffolded from blueprint/things/appraisal/verbs/rate.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal/rate.handler.ts";
import { Appraisal } from "../../blueprint/things/appraisal/thing.ts";
import { earnedOf, finalOf, inKraScore, matchesOnce, r2, totalOf, type KraLine } from "../appraisal-math.ts";

const { NotRatedManually, ScoresDontMatchKras, KraScoreOutOfRange } = Errors.declared;

/**
 * appraisal.rate: Score each KRA of an appraisal by hand, from 0 to 5.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisal.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal/verbs/rate.ts:
 *   appraisal  appraisal.id
 *   scores     GivenScores
 *
 * Answer, from blueprint/things/appraisal/verbs/rate.ts:
 *   appraisal   appraisal.id
 *   totalScore  appraisal.totalScore
 *   finalScore  appraisal.finalScore
 *
 * Refusals:
 *   NotRatedManually        exit 46   AP-006  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   ScoresDontMatchKras     exit 47   AP-007  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   KraScoreOutOfRange      exit 48   AP-008  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   AppraisalNotDraft       exit 40   AP-900  the runtime's, when the appraisal isn't in draft, carrying state; from blueprint/things/appraisal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisal.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal/verbs/rate.ts
 *
 * Idempotent by request, from blueprint/things/appraisal/verbs/rate.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal/verbs/rate.ts: p95 200ms.
 *
 * The appraisal's machine, from blueprint/things/appraisal/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    draft      AppraisalCreated
 *   ▶ draft      rate      draft      AppraisalRated
 *     draft      selfRate  draft      AppraisalSelfRated
 *     draft      submit    submitted  AppraisalSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisal.company;
 *   before it runs, it refuses AppraisalNotDraft unless the appraisal is in draft;
 *   before it runs, it hands in the appraisal it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal.rate.load, appraisal.rate.update;
 *   once it answers, it sets the appraisal's state to draft;
 *   once it answers, it writes AppraisalRated: appraisal from the answer;
 *   the call is the span appraisal.rate, and its commit appraisal.rate.commit.
 */
const rate: Handler = ({ appraisal, scores }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span appraisal.rate.load. The runtime read the appraisal and hands it in.
    const held = yield* steps.load(Effect.succeed(subject));
    if (!held) return yield* Effect.die(new Error(`appraisal ${appraisal} was read and then not found`));
    const lines = held["kras"] as ReadonlyArray<KraLine>;

    // NotRatedManually: exit 46, AP-006. Under the automated method, goals score the KRAs.
    if (held["kraEvaluationMethod"] !== "Manual Rating") {
      yield* Effect.logInfo("the appraisal is scored from goals, not by hand");
      return yield* new NotRatedManually({});
    }

    // ScoresDontMatchKras: exit 47, AP-007. Each of the appraisal's KRAs once.
    if (!matchesOnce(scores.map((s) => s.kra), lines.map((l) => l.kra))) {
      yield* Effect.logInfo("the scores don't name each of the appraisal's KRAs once");
      return yield* new ScoresDontMatchKras({});
    }

    // KraScoreOutOfRange: exit 48, AP-008. HRMS: "Goal Score cannot be greater than 5"; below 0 is Capxul's.
    if (scores.some((s) => !inKraScore(s.score))) {
      yield* Effect.logInfo("a KRA score isn't between 0 and 5");
      return yield* new KraScoreOutOfRange({});
    }

    // Step update: database, span appraisal.rate.update. The lines in the appraisal's order, each earning its share;
    // the total sums the unrounded shares (appraisal-math), and the final score follows.
    const given = new Map(scores.map((s) => [s.kra as string, r2(s.score)]));
    const kras = lines.map((l) => {
      const score = given.get(l.kra) ?? BigDecimal.fromNumberUnsafe(0);
      return { ...l, score, earned: earnedOf(score, l.weightage) };
    });
    const totalScore = totalOf("Manual Rating", kras);
    const finalScore = finalOf(totalScore, held["selfScore"] as BigDecimal.BigDecimal, held["avgFeedbackScore"] as BigDecimal.BigDecimal);
    yield* steps.update(records.update(Appraisal, appraisal, { kras, totalScore, finalScore } as never));

    // The move rate, from draft, to draft.
    yield* move();

    return { appraisal, totalScore, finalScore };
  });

export default rate;
