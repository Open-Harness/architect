// Where a defect call died (M1.49, `design/decisions/M1-49-issue-attribution.md`): the declared step it died in, and the error's tag. Pure. Under the failing
// attempt the candidates are only declared-step spans that ended as errors; an adapter's span is walked through and never chosen. The deepest wins, and on a
// tie the latest. A defect no declared step explains (a read's, or a die outside every step) is the operation itself, step `-`.
import type { CallFailure, WindowSpan } from "../types.ts";
import { stepOf, type OperationSteps } from "./spans.ts";

/** The step of a defect no declared step explains: the operation itself. */
export const NO_STEP = "-";

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

const candidates = (root: WindowSpan, spans: ReadonlyArray<WindowSpan>, operation: string, steps: OperationSteps): ReadonlyArray<{ readonly step: string; readonly depth: number; readonly start: number }> => {
  const found: Array<{ step: string; depth: number; start: number }> = [];
  const walk = (parent: WindowSpan, depth: number, seen: ReadonlySet<string>) => {
    for (const child of spans.filter((s) => s.parentSpanId === parent.spanId && !seen.has(s.spanId))) {
      const step = stepOf(child, operation, steps);
      if (step !== undefined && child.status === 2) found.push({ step, depth, start: child.start });
      walk(child, depth + 1, new Set([...seen, child.spanId]));
    }
  };
  walk(root, 1, new Set([root.spanId]));
  return found;
};

/** `attempts` are the call's own attempt spans; `undefined` when none of them ended as an error (a call that lost its commit race on every retry ended none). */
export const failureOf = (attempts: ReadonlyArray<WindowSpan>, spans: ReadonlyArray<WindowSpan>, operation: string, steps: OperationSteps): CallFailure | undefined => {
  const failing = [...attempts].filter((a) => a.status === 2).sort((a, b) => b.start - a.start)[0];
  if (failing === undefined) return undefined;
  const deepest = [...candidates(failing, spans, operation, steps)].sort((a, b) => b.depth - a.depth || b.start - a.start)[0];
  return { step: deepest?.step ?? NO_STEP, tag: text(failing.attrs["error.tag"]) ?? "Error" };
};
