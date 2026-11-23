import type { EvalsApi, PerOperation } from "./types.ts";
import { answerShape, declaredErrors, events, explainability, machinePath, steps, whoMayCall } from "./internal/calls.ts";
import { coverage, coverageSummary, percentile, performance } from "./internal/run.ts";
import { gather, replayed, where } from "./internal/evidence.ts";

/** The nine evals, in their numbered order, run for every operation. */
const PER_OPERATION: ReadonlyArray<PerOperation> = [answerShape, declaredErrors, machinePath, events, whoMayCall, steps, performance, coverage, explainability];

/**
 * The evals that can be judged from telemetry alone, which is all `watch` has: no journey decided who may call, no world
 * stored the state a move ended in, no journal was read, and coverage is what a whole run reached (L2.09, D3 #143).
 */
const LIVE: ReadonlyArray<PerOperation> = [answerShape, declaredErrors, steps, performance, explainability];

export const Evals: EvalsApi = {
  gather,
  percentile,
  where: (call) => where({ call }),
  judge: (project, evidence) => [
    ...Object.values(project.model.operations).flatMap((op) => {
      const mine = evidence.filter((e) => e.call.operation === op.name);
      return PER_OPERATION.map((ev) => ev(op, mine, { project, all: evidence }));
    }),
    coverageSummary(project.model, evidence),
  ],
  judgeLive: (project, evidence) =>
    Object.values(project.model.operations).flatMap((op) => {
      const mine = evidence.filter((e) => e.call.operation === op.name);
      if (mine.length === 0) return [];
      // A replayed call answers from the stored answer, not from a span: prove judges its shape.
      return LIVE.map((ev) => ev(op, ev === answerShape ? mine.filter((e) => !replayed(e)) : mine, { project, all: evidence }));
    }),
};
