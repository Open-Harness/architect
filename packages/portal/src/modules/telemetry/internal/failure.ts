// Where a defect call died (M1.49, `design/decisions/M1-49-issue-attribution.md`): the declared step it died in, and the error's tag. Pure. Under the failing
// attempt the candidates are only declared-step spans that ended as errors; an adapter's span is walked through and never chosen. The deepest wins, and on a
// tie the latest. A defect no declared step explains (a read's, or a die outside every step) is the operation itself, step `-`.
import type { CallFailure, WindowSpan } from "../types.ts";
import { COMMIT, stepOf, type OperationSteps } from "./spans.ts";

/**
 * The tag of a defect the runtime itself raised outside every attempt (it ran out of tries): a plain `Error`. It mirrors the fallback of `tagOf` in
 * packages/language-effect/src/modules/handler/internal/defect.ts:6, which owns the rule; change the two together.
 */
const RUNTIME_TAG = "Error";

/** The step of a defect no declared step explains: the operation itself. */
export const NO_STEP = "-";

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

const candidates = (root: WindowSpan, tag: string, spans: ReadonlyArray<WindowSpan>, operation: string, steps: OperationSteps): ReadonlyArray<{ readonly step: string; readonly depth: number; readonly start: number }> => {
  const found: Array<{ step: string; depth: number; start: number }> = [];
  const walk = (parent: WindowSpan, depth: number, seen: ReadonlySet<string>) => {
    for (const child of spans.filter((s) => s.parentSpanId === parent.spanId && !seen.has(s.spanId))) {
      const step = stepOf(child, operation, steps);
      if (step !== undefined && child.status === 2 && (text(child.attrs["error.tag"]) ?? tag) === tag) found.push({ step, depth, start: child.start });
      walk(child, depth + 1, new Set([...seen, child.spanId]));
    }
  };
  walk(root, 1, new Set([root.spanId]));
  return found;
};

/**
 * Every defect call has a failure. A step is a candidate only when it ended as an error and its `error.tag` is the attempt's own (the runtime writes it on every span a
 * defect passes through; a span from a source that wrote none is taken as the attempt's). So a step that errored and was recovered is passed over when it carries a
 * *different* tag; with the same tag (two plain `Error`s) it is still blamed, a known limit. A call whose attempts all ended ok (they lost their commit race 64 times,
 * and the runtime died outside them) died in the commit: `commit`, tagged as the runtime's own die.
 */
export const failureOf = (attempts: ReadonlyArray<WindowSpan>, spans: ReadonlyArray<WindowSpan>, operation: string, steps: OperationSteps): CallFailure => {
  const failing = [...attempts].filter((a) => a.status === 2).sort((a, b) => b.start - a.start)[0];
  if (failing === undefined) return { step: COMMIT, tag: RUNTIME_TAG };
  const tag = text(failing.attrs["error.tag"]) ?? RUNTIME_TAG;
  const deepest = [...candidates(failing, tag, spans, operation, steps)].sort((a, b) => b.depth - a.depth || b.start - a.start)[0];
  return { step: deepest?.step ?? NO_STEP, tag };
};
