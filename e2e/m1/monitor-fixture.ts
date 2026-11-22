// What check 39 (M1.49) judges the portal's monitoring with: calls made into traces at fixed times, an honest `TraceSource` and metrics reader over
// them, an issue ledger that is only a Map, and the ORACLE, which says from the calls alone (never from anything the portal answered) which alerts
// must fire. The rules it reads are the compiler's own, out of `generated/model/model.json`; the defaults they must carry are K18's and the research's.
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { Wire, type BlueprintWire, type PortalContext } from "@orthograph/portal";
import { PortalServer } from "@orthograph/portal/server";
import { SourceFailed, type Span, type Trace } from "@orthograph/prove";

export const NOW = 1_800_000_000_000;
export const WINDOW = 30 * 60_000;
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const ENV = "local";

/** K18's defaults (design/research/monitoring.md, "What falls out"): the standard burn windows, long then short, and the least calls before a burn alert fires. */
export const OBJECTIVES = {
  latency: { target: 0.95, windowDays: 28 },
  defect: { target: 0.999, windowDays: 28 },
  alerts: {
    fast: { burn: 14.4, windowsMs: [HOUR, 5 * MIN], severity: "page" },
    slow: { burn: 6, windowsMs: [6 * HOUR, 30 * MIN], severity: "page" },
    ticket: { burn: 1, windowsMs: [3 * DAY, 6 * HOUR], severity: "ticket" },
  },
  minCalls: 20,
} as const;

export interface BurnAlert { readonly name: string; readonly burn: number; readonly windowsMs: ReadonlyArray<number>; readonly severity: string }
export interface AlertRule {
  readonly id: string;
  readonly kind: "latency" | "defect" | "anomaly" | "verdict";
  readonly labels: Readonly<Record<string, string>>;
  readonly target?: number; readonly windowDays?: number; readonly thresholdMs?: number; readonly minCalls?: number;
  readonly alerts?: ReadonlyArray<BurnAlert>;
}
export interface AlertRow {
  readonly rule: string; readonly alert: string; readonly state: string; readonly severity: string;
  readonly windows?: ReadonlyArray<{ readonly ms: number; readonly calls: number; readonly bad: number }>;
}
export interface IssueRow {
  readonly key: string; readonly operation: string; readonly step: string; readonly tag: string; readonly owner: string; readonly occurrences: number;
  readonly firstSeen: { readonly at: number; readonly hash: string }; readonly lastSeen: { readonly at: number; readonly hash: string }; readonly regressed: boolean;
}
export interface MonitorAnswer { readonly environment: string; readonly now: number; readonly alerts: ReadonlyArray<AlertRow>; readonly issues: ReadonlyArray<IssueRow> }

// ---- calls, as traces ----

export interface CallSpec {
  readonly op: string; readonly minutesAgo: number; readonly ms: number;
  readonly outcome: "answered" | "refused" | "defect";
  /** A refusal's name, for `outcome: "refused"`. */
  readonly refusal?: string; readonly code?: string;
  /** A defect: the step that died and the error's tag. */
  readonly step?: string; readonly tag?: string;
  readonly at?: number;
  /** A call that took two attempts (the first lost the commit): its duration is the extent of both, each attempt taking half. */
  readonly attempts?: 1 | 2;
}

const hex = (n: number) => createHash("sha256").update(`m1.49:${n}`).digest("hex");
const startOf = (spec: CallSpec, now: number) => spec.at ?? now - Math.round(spec.minutesAgo * MIN);

/** Every call made into a trace of the shapes the runtime writes (check 17, `refusal`, `defect`, a failing step's span), at fixed times from `now`. */
export const tracesOf = (specs: ReadonlyArray<CallSpec>, now = NOW, from = 0): Map<string, Trace> => {
  const traces = new Map<string, Trace>();
  specs.forEach((spec, i) => {
    const n = from + i + 1;
    const trace = hex(n).slice(0, 32);
    const sid = (k: number) => hex(n * 10 + k).slice(0, 16);
    const start = startOf(spec, now);
    const attempts = spec.attempts ?? 1;
    const each = Math.round(spec.ms / attempts);
    const attemptSpan = (attempt: number): Span => ({
      traceId: trace, spanId: sid(attempt === 1 ? 1 : 3), parentSpanId: "", name: spec.op, ms: each, start: start + (attempt - 1) * each, status: attempt === attempts && spec.outcome === "defect" ? 2 : 1,
      attrs: {
        operation: spec.op, attempt, "principal.kind": "anonymous", environment: ENV, store: "database",
        ...(attempt === attempts && spec.outcome === "refused" ? { refusal: spec.refusal ?? "Refused", "refusal.code": spec.code ?? "XX-001" } : {}),
        ...(attempt === attempts && spec.outcome === "defect" ? { defect: `Error: planted defect ${n}`, "error.tag": spec.tag ?? "Error" } : {}),
      },
    });
    const spans: Array<Span> = Array.from({ length: attempts }, (_, i) => attemptSpan(i + 1));
    if (spec.outcome === "defect" && spec.step !== undefined) spans.push({ traceId: trace, spanId: sid(2), parentSpanId: sid(attempts === 1 ? 1 : 3), name: `${spec.op}.${spec.step}`, attrs: { "step.kind": "database" }, status: 2, ms: 1, start: start + (attempts - 1) * each + 1 });
    traces.set(trace, { spans, logs: [] });
  });
  return traces;
};

/** A `TraceSource` over fixed traces. Honest (a trace is in when one of its spans started within `since` of `now`) and FAILS without `now`: a portal that reads the clock cannot be judged. */
export const sourceOf = (traces: ReadonlyMap<string, Trace>) => ({
  find: (trace: string) => Effect.succeed(traces.get(trace)),
  window: (since: number, now?: number) => now === undefined
    ? Effect.fail(new SourceFailed({ message: "the portal asked for a window without `now`: it reads a clock" }))
    : Effect.succeed(new Map([...traces].filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))),
});

/** The window's `ortho.calls`: one point per call in the window, by operation and outcome (a call's first start decides). */
export const metricsOf = (traces: ReadonlyMap<string, Trace>) => ({
  window: (since: number, now?: number) => {
    if (now === undefined) return Effect.fail(new SourceFailed({ message: "the portal asked for metrics without `now`: it reads a clock" }));
    const points = new Map<string, { name: string; labels: Record<string, string>; value: number }>();
    for (const t of traces.values()) {
      const op = t.spans.find((s) => typeof s.attrs["operation"] === "string" && typeof s.attrs["attempt"] === "number")!;
      if (op.start < now - since || op.start > now) continue;
      const refusal = op.attrs["refusal"];
      const labels: Record<string, string> = { operation: String(op.attrs["operation"]), outcome: typeof refusal === "string" ? "refused" : op.status === 2 ? "defect" : "answered", ...(typeof refusal === "string" ? { refusal } : {}) };
      const key = JSON.stringify(labels);
      points.set(key, { name: "ortho.calls", labels, value: (points.get(key)?.value ?? 0) + 1 });
    }
    return Effect.succeed([...points.values()]);
  },
});

/** What a Worker would keep across requests, as the portal is handed it: opaque JSON by key. Nothing the portal keeps anywhere else survives a new one. */
export const ledgerOf = () => {
  const held = new Map<string, string>();
  return {
    get: (key: string) => Effect.sync(() => (held.has(key) ? (JSON.parse(held.get(key)!) as unknown) : undefined)),
    put: (key: string, value: unknown) => Effect.sync(() => { held.set(key, JSON.stringify(value)); }),
    size: () => held.size,
    writes: () => [...held.keys()],
  };
};
export type Ledger = ReturnType<typeof ledgerOf>;

export const decode = (json: unknown): Promise<BlueprintWire> => Effect.runPromise(Wire.decode(json));

export interface Scene { readonly traces: ReadonlyMap<string, Trace>; readonly now?: number; readonly ledger?: Ledger; readonly environment?: string }
export const contextOf = (blueprint: BlueprintWire, scene: Scene): PortalContext =>
  ({ blueprint, reader: null, bundleRevision: null, live: { environment: scene.environment ?? ENV, source: sourceOf(scene.traces), metrics: metricsOf(scene.traces), now: scene.now ?? NOW, windowMs: WINDOW }, ...(scene.ledger === undefined ? {} : { ledger: scene.ledger }) }) as unknown as PortalContext;

/** One `GET /_portal/v1/monitor` against the portal's server half, as a Worker calls it. */
export const monitor = async (context: PortalContext, digest: string = context.blueprint.digest) => {
  const response = await Effect.runPromise(PortalServer.handle(context, new Request(`http://127.0.0.1/_portal/v1/monitor?digest=${digest}`)) as Effect.Effect<Response>);
  const text = await response.text();
  return { status: response.status, text, body: (response.status === 200 ? JSON.parse(text) : undefined) as MonitorAnswer | undefined };
};

// ---- the oracle ----

export const rulesOf = (model: unknown): ReadonlyArray<AlertRule> => ((model as { alertRules?: ReadonlyArray<AlertRule> }).alertRules ?? []);
const within = (spec: CallSpec, since: number, now: number) => startOf(spec, now) >= now - since && startOf(spec, now) <= now;

/** A wrong evaluator, as a plant: `strict` fires only when the burn is MORE than the rate; `dropRefused` leaves refused calls out of the call count; `refusalNotBadLatency` counts a slow refusal as a good call for latency. The check refuses each (see "39 control: the scenes refuse"). */
export type Fault = "strict" | "dropRefused" | "refusalNotBadLatency";

/** Decimals as integers, millionths: a rate of 14.4 or a target of 0.999 is never divided in floats (0.05 / (1 - 0.95) is 0.99999..., not 1). */
const MILLIONTHS = 1_000_000n;
const millionths = (x: number): bigint => BigInt(Math.round(x * 1_000_000));
/** `bad / calls / (1 - target) >= burn`, decided as `bad >= burn * (1 - target) * calls` with no division: bad * 10^12 >= burnM * (10^6 - targetM) * calls. */
const burnsAtLeast = (bad: number, calls: number, target: number, burn: number, strict: boolean): boolean => {
  const left = BigInt(bad) * MILLIONTHS * MILLIONTHS;
  const right = millionths(burn) * (MILLIONTHS - millionths(target)) * BigInt(calls);
  return calls > 0 && (strict ? left > right : left >= right);
};

/** Which alerts must fire in `env` at `now` over `specs`, and what each window counted. A burn alert fires when both its windows burn at its rate or MORE (equality fires) and its short window held `minCalls` calls. A refusal is a call, and a good one for the defect objective; a latency call is bad when it took over `thresholdMs`, whatever it ended as. */
export const expected = (rules: ReadonlyArray<AlertRule>, specs: ReadonlyArray<CallSpec>, now: number, env: string = ENV, fault?: Fault): ReadonlyArray<AlertRow> =>
  rules.filter((r) => r.labels["environment"] === "*" || r.labels["environment"] === env).flatMap((rule): Array<AlertRow> => {
    if (rule.alerts === undefined) return [{ rule: rule.id, alert: rule.kind, state: "any", severity: rule.labels["severity"]! }];
    return rule.alerts.map((a) => {
      const windows = a.windowsMs.map((ms) => {
        const mine = specs.filter((s) => s.op === rule.labels["operation"] && within(s, ms, now) && !(fault === "dropRefused" && s.outcome === "refused"));
        return { ms, calls: mine.length, bad: mine.filter((s) => (rule.kind === "latency" ? s.ms > rule.thresholdMs! && !(fault === "refusalNotBadLatency" && s.outcome === "refused") : s.outcome === "defect")).length };
      });
      const burns = windows.every((w) => burnsAtLeast(w.bad, w.calls, rule.target!, a.burn, fault === "strict"));
      return { rule: rule.id, alert: a.name, state: burns && windows[a.windowsMs.length - 1]!.calls >= rule.minCalls! ? "firing" : "ok", severity: a.severity, windows };
    });
  });

/** The same call made `count` times, `minutesAgo` apart by one second so that every trace is its own. */
export const many = (count: number, spec: CallSpec, now = NOW): Array<CallSpec> => Array.from({ length: count }, (_, i) => ({ ...spec, at: now - Math.round(spec.minutesAgo * MIN) - i * 1000 }));

// ---- the reference derivation: what the compiler must write, from the model alone ----

export interface ModelIn {
  readonly operations: Readonly<Record<string, { readonly file: string; readonly budget?: { readonly p95Ms: number } | null; readonly hash: string; readonly refusals: ReadonlyArray<string> }>>;
  readonly refusals: Readonly<Record<string, string>>;
  readonly things: Readonly<Record<string, { readonly errors?: Readonly<Record<string, { readonly code: string }>> }>>;
  readonly journeys: Readonly<Record<string, { readonly name: string; readonly file: string }>>;
  readonly environments?: Readonly<Record<string, unknown>>;
}
const burn = (): ReadonlyArray<BurnAlert> => Object.entries(OBJECTIVES.alerts).map(([name, a]) => ({ name, burn: a.burn, windowsMs: [...a.windowsMs], severity: a.severity }));

/** The owner of an anomaly: the file of the thing whose errors declare the code, else the runtime's. */
export const anomalyOwner = (model: ModelIn, code: string): string => {
  const thing = Object.entries(model.things).find(([, t]) => Object.values(t.errors ?? {}).some((e) => e.code === code))?.[0];
  return thing === undefined ? "orthograph" : `blueprint/things/${thing}/errors.ts`;
};

/** K18 decision 1: a latency objective per `budget`, a defect objective per operation, an anomaly per refusal code, a verdict per journey and environment. Sorted by id. */
export const deriveRules = (model: ModelIn): ReadonlyArray<AlertRule> => [
  ...Object.entries(model.operations).filter(([, op]) => op.budget != null).map(([name, op]): AlertRule => ({
    id: `latency:${name}`, kind: "latency", labels: { environment: "*", operation: name, severity: "page", owner: op.file },
    ...OBJECTIVES.latency, thresholdMs: op.budget!.p95Ms, minCalls: OBJECTIVES.minCalls, alerts: burn(),
  })),
  ...Object.entries(model.operations).map(([name, op]): AlertRule => ({
    id: `defect:${name}`, kind: "defect", labels: { environment: "*", operation: name, severity: "page", owner: op.file },
    ...OBJECTIVES.defect, minCalls: OBJECTIVES.minCalls, alerts: burn(),
  })),
  ...Object.values(model.refusals).map((code): AlertRule => ({ id: `anomaly:${code}`, kind: "anomaly", labels: { environment: "*", code, severity: "ticket", owner: anomalyOwner(model, code) } })),
  ...Object.values(model.journeys).flatMap((journey) => Object.keys(model.environments ?? {}).map((environment): AlertRule => ({
    id: `verdict:${journey.name}:${environment}`, kind: "verdict", labels: { environment, journey: journey.name, severity: "page", owner: journey.file },
  }))),
].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** A wire signed again with `alertRules` in its model: the signed JSON as a Worker would hold it (`Wire.decode` drops what its schema does not name, and M1.49 adds `alertRules` to it). */
export const withRules = (wire: unknown, rules: ReadonlyArray<AlertRule>): Record<string, unknown> => {
  const { digest: _, ...unsigned } = structuredClone(wire) as { model: Record<string, unknown> } & Record<string, unknown>;
  unsigned.model = { ...unsigned.model, alertRules: rules };
  return { ...unsigned, digest: Wire.digestOf(unsigned) };
};
