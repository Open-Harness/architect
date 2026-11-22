// What check 40 expects a machine's graph to light, from the model and a fixture, never from the page (M1.50: "live counts on moves, a trace from a
// journey's run, no state shows a count").
// Decisions of the checks author, for the builder (each is the model's own reading, none is a taste):
//  - A TRACE is read from a journey's declared steps, in order: a step on an operation of this thing that has a move, whose checks `emits` an event,
//    MOVED (its 1-based step number is on the move's edge, `data-moved`); one whose checks `refuses` an error the move can be turned back with was
//    REFUSED (`data-refused`, "<step>:<error>"). A refusal at the door (`NotAllowed`, `InvalidPayload`, `IdempotencyConflict`) never reached the move and marks
//    nothing (the first two: `design/portal.md:318`, "a call refused at the door (`NotAllowed`, a bad payload) opens no span", and check 24's header, which lists them as the
//    runtime's own refusals for every call; the third: check 24, which makes it the fourth of them). `<Thing>NotFound` is NOT a door: no source names it one (check 24 lists it
//    beside them as a runtime refusal, `design/portal.md:318` leaves it out, and it is raised after the thing is read, inside the span), so a journey that refuses one on an
//    operation with a move marks that move REFUSED, like any other refusal the move can be turned back with; an answer with no event and no refusal (a replay) made no move. A move edge is lit when it moved or was refused; a state never is.
//  - LIVE counts are the moves committed in the window: an operation span (`attempt`) carrying `move.name` counts once, keyed by the operation's thing and
//    that move; an attempt that was refused, or one outside the window, counts nothing. Counts sit on move edges (`data-count`), never on a state.
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { SourceFailed, type Span, type Trace } from "@orthograph/prove";
import type { GraphModel } from "./graph-expect.ts";

export const DOOR: ReadonlyArray<string> = ["NotAllowed", "InvalidPayload", "IdempotencyConflict"];

export interface Lit { readonly moved: ReadonlyArray<number>; readonly refused: ReadonlyArray<string> }

/** A journey's trace on one thing's machine: for each move key, the steps it moved at and the refusals it met. */
export const traceOf = (m: GraphModel, thing: string, journey: string): Readonly<Record<string, Lit>> => {
  const out: Record<string, { moved: Array<number>; refused: Array<string> }> = {};
  for (const key of Object.keys(m.things[thing]!.machine!.moves)) out[key] = { moved: [], refused: [] };
  m.journeys[journey]!.steps.forEach((step, i) => {
    const op = m.operations[step.call.operation]!;
    if (op.thing !== thing || op.move === null) return;
    const entry = out[op.move.key]!;
    if (step.checks.some((c) => c.kind === "emits")) entry.moved.push(i + 1);
    for (const c of step.checks) if (c.kind === "refuses" && c.error !== undefined && !DOOR.includes(c.error)) entry.refused.push(`${String(i + 1)}:${c.error}`);
  });
  return out;
};

/** The model with one more step at the end of a journey: a call of `operation` that a refusal `error` answers (no journey of Plugged In or acme refuses `InvalidPayload`, so the door's list is proved on this). */
export const withRefusal = (m: GraphModel, journey: string, operation: string, error: string): GraphModel => {
  const j = m.journeys[journey]!;
  return { ...m, journeys: { ...m.journeys, [journey]: { ...j, steps: [...j.steps, { call: { operation }, checks: [{ kind: "refuses", error }] }] } } };
};

export const NOW = 1_800_000_000_000;
export const WINDOW = 30 * 60_000;
const hex = (n: number) => createHash("sha256").update(`m1.50:${String(n)}`).digest("hex");

export interface Live { readonly traces: Map<string, Trace>; readonly counts: Readonly<Record<string, number>> }

/** One trace per attempt we want: for the k-th operation with a move, k % 3 moves in the window (so some move zero times), one move before the window, one refused attempt in it. */
export const liveFixture = (m: GraphModel): Live => {
  const traces = new Map<string, Trace>();
  const counts: Record<string, number> = {};
  let n = 0;
  const trace = (operation: string, minutesAgo: number, attrs: Record<string, unknown>, status = 1) => {
    n += 1;
    const id = hex(n).slice(0, 32), span: Span = { traceId: id, spanId: hex(n).slice(0, 16), parentSpanId: "", name: operation, attrs: { operation, attempt: 1, ...attrs }, status, ms: 9, start: NOW - minutesAgo * 60_000 };
    traces.set(id, { spans: [span], logs: [] });
  };
  Object.values(m.operations).filter((o) => o.move !== null).forEach((op, k) => {
    const key = `${op.thing}.${op.move!.key}`;
    counts[key] = (counts[key] ?? 0) + (k % 3);
    for (let i = 0; i < k % 3; i++) trace(op.name, 5 + i, { "move.name": op.move!.key });
    trace(op.name, 90, { "move.name": op.move!.key });
    trace(op.name, 2, { refusal: "NotAllowed" });
  });
  return { traces, counts };
};

const failing = (what: string) => Effect.fail(new SourceFailed({ message: `the portal asked for ${what} without \`now\`: it reads a clock` }));
/** The context a portal is served with: the wire, and `live` over the fixture, as check 21 serves its own. */
export const liveContext = (blueprint: unknown, live: Live) => {
  const calls = [...live.traces.values()].map((t) => t.spans[0]!);
  return {
    blueprint, reader: null, bundleRevision: null,
    live: {
      environment: "staging", now: NOW, windowMs: WINDOW,
      source: {
        find: (id: string) => Effect.succeed(live.traces.get(id)),
        window: (since: number, now?: number) => now === undefined ? failing("a window") : Effect.succeed(new Map([...live.traces].filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))),
      },
      metrics: {
        window: (since: number, now?: number) => now === undefined ? failing("metrics") : Effect.succeed(Object.values(calls.filter((s) => s.start >= now - since && s.start <= now).reduce<Record<string, { name: string; labels: Record<string, string>; value: number }>>((all, s) => {
          const refused = typeof s.attrs["refusal"] === "string";
          const labels: Record<string, string> = { operation: String(s.attrs["operation"]), outcome: refused ? "refused" : "answered", ...(refused ? { refusal: String(s.attrs["refusal"]) } : {}) };
          const key = JSON.stringify(labels);
          all[key] = { name: "ortho.calls", labels, value: (all[key]?.value ?? 0) + 1 };
          return all;
        }, {}))),
      },
    },
  };
};
