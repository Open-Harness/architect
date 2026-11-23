// The burn alerts of the derived rules, over the calls of each window. Pure. A burn alert fires when the objective burns at its rate or more over BOTH its
// windows (equality fires) and its short window held at least `minCalls` calls. Every call counts, a refusal included: a refusal is a good call for the
// defect objective, and a latency call is bad when it took longer than the rule's threshold, whatever it ended as. Decided in integers: a rate of 14.4 or a
// target of 0.999 is never divided in floats (0.05 / (1 - 0.95) is 0.99999..., not 1).
import type { AlertRuleWire } from "#modules/wire/types.js";
import type { TelemetryCall } from "#modules/telemetry/types.js";
import type { AlertRow, WindowCount } from "../types.ts";

const MILLIONTHS = 1_000_000n;
const millionths = (x: number): bigint => BigInt(Math.round(x * 1_000_000));

/** `bad / calls / (1 - target) >= burn`, as `bad >= burn * (1 - target) * calls`, with no division. */
const burnsAtLeast = (bad: number, calls: number, target: number, burn: number): boolean =>
  calls > 0 && BigInt(bad) * MILLIONTHS * MILLIONTHS >= millionths(burn) * (MILLIONTHS - millionths(target)) * BigInt(calls);

const count = (rule: AlertRuleWire, calls: ReadonlyArray<TelemetryCall>, ms: number): WindowCount => {
  const mine = calls.filter((c) => c.operation === rule.labels["operation"]);
  return { ms, calls: mine.length, bad: mine.filter((c) => (rule.kind === "latency" ? c.durationMs > rule.thresholdMs! : c.outcome === "defect")).length };
};

/** `callsIn(ms)` is the calls that started within `ms` of now, or `undefined` when that window could not be read. */
export const evaluate = (rules: ReadonlyArray<AlertRuleWire>, callsIn: (ms: number) => ReadonlyArray<TelemetryCall> | undefined): ReadonlyArray<AlertRow> =>
  rules.flatMap((rule): ReadonlyArray<AlertRow> => {
    const severity = rule.labels["severity"] ?? "ticket";
    if (rule.alerts === undefined || rule.target === undefined) return [{ rule: rule.id, alert: rule.kind, state: "unknown", severity }];
    return rule.alerts.map((alert): AlertRow => {
      const read = alert.windowsMs.map((ms) => ({ ms, calls: callsIn(ms) }));
      if (read.some((w) => w.calls === undefined)) return { rule: rule.id, alert: alert.name, state: "unknown", severity: alert.severity };
      const windows = read.map((w) => count(rule, w.calls!, w.ms));
      const short = windows[windows.length - 1]!;
      const burning = windows.every((w) => burnsAtLeast(w.bad, w.calls, rule.target!, alert.burn));
      return { rule: rule.id, alert: alert.name, state: burning && short.calls >= (rule.minCalls ?? 0) ? "firing" : "ok", severity: alert.severity, windows };
    });
  });
