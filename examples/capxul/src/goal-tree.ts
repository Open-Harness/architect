// What a goal's move carries to the records around it (`design/decisions/CX-appraisals.md`): each group above the goal
// takes the average progress of its children that aren't archived, up to the root, as a field update (a group's status
// follows by its own call, goal.roll-up, until #972); and an appraisal scored from goals takes each KRA's score from its
// top-level goals that aren't archived, with its total and final score.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Goal } from "../blueprint/things/goal/thing.ts";
import { Appraisal } from "../blueprint/things/appraisal/thing.ts";
import { oneAppraisalPerCycle } from "../blueprint/things/appraisal/invariants.ts";
import { avg, earnedOf, finalOf, totalOf, type KraLine } from "./appraisal-math.ts";

type D = BigDecimal.BigDecimal;
type Row = { readonly id: string; readonly kra: string; readonly progress: D; readonly parentGoal?: string | null; readonly state?: string };

/** The goal that moved, as it is once its call answers: the runtime sets its state only then, so a list still shows the old one. */
export interface Moved {
  readonly id: string;
  readonly progress: D;
  readonly state: string;
}

/** The employee's goals in the cycle, with the moved goal as it will be. Each run lists again, so it sees this call's own writes. */
const goalsOf = (employee: string, appraisalCycle: string, moved: Moved) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const page = yield* records.list({ thing: Goal, where: { employee, appraisalCycle }, state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined });
    return (page.items as unknown as ReadonlyArray<Row>).map((g) => (g.id === moved.id ? { ...g, progress: moved.progress, state: moved.state } : g));
  });

/** Roll the moved goal's progress up its tree, then rescore the appraisal it feeds; the appraisal is answered. */
export const follow = (employee: string, appraisalCycle: string, moved: Moved) =>
  Effect.gen(function* () {
    const records = yield* Records;

    let parent = (yield* goalsOf(employee, appraisalCycle, moved)).find((g) => g.id === moved.id)?.parentGoal;
    while (parent) {
      const all = yield* goalsOf(employee, appraisalCycle, moved);
      const group = all.find((g) => g.id === parent);
      if (!group) break;
      const progress = avg(all.filter((g) => g.parentGoal === group.id && g.state !== "archived").map((g) => g.progress));
      yield* records.update(Goal, group.id, { progress } as never);
      parent = group.parentGoal;
    }

    const appraisal = yield* records.findBy(oneAppraisalPerCycle, { employee, appraisalCycle } as never);
    if (!appraisal) return undefined;
    if (appraisal["kraEvaluationMethod"] !== "Automated Based on Goal Progress") return appraisal["id"] as string;

    const all = yield* goalsOf(employee, appraisalCycle, moved);
    const kras = (appraisal["kras"] as ReadonlyArray<KraLine>).map((line) => {
      const score = avg(all.filter((g) => g.kra === line.kra && !g.parentGoal && g.state !== "archived").map((g) => g.progress));
      return { ...line, score, earned: earnedOf(score, line.weightage) };
    });
    const totalScore = totalOf("Automated Based on Goal Progress", kras);
    const finalScore = finalOf(totalScore, appraisal["selfScore"] as D, appraisal["avgFeedbackScore"] as D);
    yield* records.update(Appraisal, appraisal["id"] as string, { kras, totalScore, finalScore } as never);
    return appraisal["id"] as string;
  });
