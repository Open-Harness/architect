// Which attempt spans are one call (O3). Attempts of one call are sequential, but different calls' attempts overlap, and under a sent traceparent every call's
// attempts share the caller's span as their parent, so a trace says nothing about which belong together. The runtime names the call: every attempt span of
// a call carries `call.id` (and a read's or device's one span does), made once before its first attempt. For spans without it (older runs, fixtures) the
// reader pairs only what it can prove, and says `unknown` where it cannot.
import type { WindowSpan } from "../types.ts";

export const CALL_ID = "call.id";

/** The attempt spans of one call, and whether the reader could not tell which spans they are. */
export interface CallGroup {
  readonly spans: ReadonlyArray<WindowSpan>;
  /** Attempts that two or more calls could each have been: their call is a guess, so its outcome is `unknown` and it counts no move. */
  readonly unresolved: boolean;
}

export const numberOf = (span: WindowSpan) => (typeof span.attrs["attempt"] === "number" ? span.attrs["attempt"] : 1);

/** An attempt a retry can no longer follow: it was refused, it died, or its commit won. A conflict (or no commit span to say) can be followed. */
const final = (span: WindowSpan, all: ReadonlyArray<WindowSpan>) =>
  typeof span.attrs["refusal"] === "string" || span.status === 2
  || all.some((s) => s.parentSpanId === span.spanId && s.attrs["step.kind"] === "commit" && s.attrs["commit.outcome"] === "committed");

/** Without a name: attempt 1 starts a call, and attempt `n` continues the one call whose last attempt was `n - 1` and could be followed. More than one: unresolved. */
const pair = (spans: ReadonlyArray<WindowSpan>, all: ReadonlyArray<WindowSpan>): ReadonlyArray<CallGroup> => {
  let chains: Array<{ spans: Array<WindowSpan>; unresolved: boolean }> = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start || numberOf(a) - numberOf(b))) {
    const n = numberOf(span);
    const open = n > 1 ? chains.filter((c) => numberOf(c.spans[c.spans.length - 1]!) === n - 1 && !final(c.spans[c.spans.length - 1]!, all)) : [];
    if (open.length === 0) chains.push({ spans: [span], unresolved: false });
    else if (open.length === 1) open[0]!.spans.push(span);
    else {
      // Several calls could have taken it: they and it are one call here, which says `unknown` and counts no move, rather than a guess that invents a defect.
      const [head, ...rest] = open;
      for (const other of rest) head!.spans.push(...other.spans);
      chains = chains.filter((c) => !rest.includes(c));
      head!.spans.push(span);
      head!.unresolved = true;
    }
  }
  return chains;
};

/** One operation's attempt spans in one trace, split into calls: by `call.id` where the runtime named it, else by what can be proved. */
export const groupCalls = (attempts: ReadonlyArray<WindowSpan>, all: ReadonlyArray<WindowSpan>): ReadonlyArray<CallGroup> => {
  const named = new Map<string, Array<WindowSpan>>();
  const unnamed: Array<WindowSpan> = [];
  for (const span of attempts) {
    const id = span.attrs[CALL_ID];
    if (typeof id === "string") named.set(id, [...(named.get(id) ?? []), span]);
    else unnamed.push(span);
  }
  return [...[...named.values()].map((spans): CallGroup => ({ spans, unresolved: false })), ...pair(unnamed, all)];
};
