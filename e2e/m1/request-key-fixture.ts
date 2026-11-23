// Check 38's window (M1.12a): Plugged In's `handle.claim`, called five ways, as the runtime writes them once `request.key` is on the operation's span.
// The keys are made up here, never read from the output they judge. Oldest first: a keyed call that lost its commit once, its replay (the same
// key), a keyed call with another key, a keyed refusal, and a call made with no key.
import { createHash } from "node:crypto";
import { Effect } from "effect";
import type { BlueprintWire, PortalContext } from "@orthograph/portal";
import { SourceFailed, type Span, type Trace } from "@orthograph/prove";

export const NOW = 1_800_000_000_000;
export const WINDOW = 30 * 60_000;
const at = (minutesAgo: number) => NOW - minutesAgo * 60_000;
const hex = (n: number) => createHash("sha256").update(`m1.12a:${n}`).digest("hex");
const id = (n: number) => hex(n).slice(0, 32);
const sid = (n: number) => hex(n).slice(0, 16);

/** The keys the callers sent. Each has a part in the middle (`7f31`, `4c9e`, `0b52`) that no other key has and no key starts with. */
export const KEYS = { claim: "claim-7f31-abc", other: "second-0b52-key", refused: "denied-4c9e-key" } as const;

export interface Called { readonly trace: string; readonly key: string | null; readonly outcome: "answered" | "refused" }
/** The calls, newest first, as the calls table lists them, each with the key its spans carry (`null`: none). */
export interface Window { readonly traces: Map<string, Trace>; readonly calls: ReadonlyArray<Called> }

/** The refusal the keyed refusal is: the one `handle.claim` declares, as the wire says. */
const refusalOf = (wire: BlueprintWire): string => wire.model.operations["handle.claim"]!.errors[0] ?? "HandleTaken";

const span = (n: number, trace: number, name: string, start: number, attrs: Record<string, unknown>, over: Partial<Span> = {}): Span =>
  ({ traceId: id(trace), spanId: sid(n), parentSpanId: "", name, attrs, status: 1, ms: 9, start, ...over });

/**
 * Which spans carry the key: `true` all of them (a real run: every attempt), `false` none (a window from before the span carried the key: the same calls
 * and none of the keys), `"first"` the retried call's attempt 1 only and `"retry"` its attempt 2 only (the spans a source that lost one of them leaves).
 * The portal's rule (`design/portal.md` is silent; fixed here): a call's `requestKey` is the key its attempts' spans carry, whichever of them has it, so
 * the same key in all three windows that have one; it never depends on which attempt the key was read from.
 */
export type Keyed = boolean | "first" | "retry";
export const window = (wire: BlueprintWire, keyed: Keyed = true): Window => {
  const refusal = refusalOf(wire);
  // `attempt` is given for the retried call only: the one-attempt calls carry their key in every window that has keys.
  const k = (key: string, attempt?: number): Record<string, unknown> =>
    (keyed === false || (attempt !== undefined && ((keyed === "first" && attempt !== 1) || (keyed === "retry" && attempt !== 2))) ? {} : { "request.key": key });
  const traces = new Map<string, Trace>();
  const put = (n: number, spans: ReadonlyArray<Span>) => traces.set(id(n), { spans: [...spans], logs: [] });
  // 1. the keyed call: two attempts (the first lost the commit), both spans carry the key
  put(1, [
    span(10, 1, "handle.claim", at(9), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous", ...k(KEYS.claim, 1) }),
    span(11, 1, "handle.claim", at(9) + 3, { operation: "handle.claim", attempt: 2, "principal.kind": "anonymous", ...k(KEYS.claim, 2) }),
  ]);
  // 2. its replay: the same key again, which changed nothing
  put(2, [span(20, 2, "handle.claim", at(8), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous", "request.replayed": true, ...k(KEYS.claim) })]);
  // 3. another key
  put(3, [span(30, 3, "handle.claim", at(7), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous", ...k(KEYS.other) })]);
  // 4. a keyed refusal the operation made itself (a declared one, on its own span). A refusal at the door, `<operation>.refused`, carries the key too
  //    (check A) but is counted and never a row of the table (check 21 K), so it is not in this window's calls.
  put(4, [span(40, 4, "handle.claim", at(6), { operation: "handle.claim", attempt: 1, "principal.kind": "agent", refusal, ...k(KEYS.refused) })]);
  // 5. no key
  put(5, [span(50, 5, "handle.claim", at(5), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous" })]);
  const key = (value: string) => (keyed === false ? null : value);
  return {
    traces,
    calls: [
      { trace: id(5), key: null, outcome: "answered" }, { trace: id(4), key: key(KEYS.refused), outcome: "refused" }, { trace: id(3), key: key(KEYS.other), outcome: "answered" },
      { trace: id(2), key: key(KEYS.claim), outcome: "answered" }, { trace: id(1), key: key(KEYS.claim), outcome: "answered" },
    ],
  };
};

/** A `TraceSource` over the window, as honest as check 21's: it filters by the window and refuses a missing `now`. */
const source = (traces: ReadonlyMap<string, Trace>) => ({
  find: (trace: string) => Effect.succeed(traces.get(trace)),
  window: (since: number, now?: number) => now === undefined
    ? Effect.fail(new SourceFailed({ message: "the portal asked for a window without `now`: it reads a clock" }))
    : Effect.succeed(new Map([...traces].filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))),
});

/** `ortho.calls` for the window: one point per call. */
const metrics = (calls: ReadonlyArray<Called>, refusal: string) => ({
  window: (_since: number, now?: number) => now === undefined
    ? Effect.fail(new SourceFailed({ message: "the portal asked for metrics without `now`: it reads a clock" }))
    : Effect.succeed(calls.map((c) => ({ name: "ortho.calls", labels: { operation: "handle.claim", outcome: c.outcome, ...(c.outcome === "refused" ? { refusal } : {}) }, value: 1 }))),
});

export const contextOf = (wire: BlueprintWire, run: Window): PortalContext =>
  ({ blueprint: wire, reader: null, bundleRevision: null, live: { environment: "staging", source: source(run.traces), metrics: metrics(run.calls, refusalOf(wire)), now: NOW, windowMs: WINDOW } }) as unknown as PortalContext;
