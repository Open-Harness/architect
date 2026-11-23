import { Effect } from "effect";
import { Telemetry } from "#modules/telemetry/service.js";
import type { MonitorApi } from "./types.ts";
import { evaluate } from "./internal/evaluate.ts";
import { keep } from "./internal/issues.ts";

const read: MonitorApi["read"] = (blueprint, live, ledger) =>
  Effect.gen(function* () {
    const rules = (blueprint.model.alertRules ?? []).filter((r) => r.labels["environment"] === "*" || r.labels["environment"] === live.environment);
    // Each distinct window an alert names is read as it is named; a source that fails leaves what it would have filled unknown, never zero.
    // A window longer than the history the source can supply holds only part of it: it is not read, and an alert that needs it is `unknown`, never judged on the part.
    const reach = live.historyMs ?? Number.POSITIVE_INFINITY;
    // The display window is always read (the issues are its calls); an alert's window is judged only when the history reaches it.
    const windows = [...new Set([live.windowMs, ...rules.flatMap((r) => (r.alerts ?? []).flatMap((a) => a.windowsMs).filter((ms) => ms <= reach))])];
    const read = yield* Effect.forEach(windows, (ms) => live.source.window(ms, live.now).pipe(
      Effect.map((traces) => [ms, traces] as const),
      Effect.catchCause(() => Effect.succeed([ms, undefined] as const)),
    ));
    // Each window is grouped into calls once per read; every rule and the issues read that.
    const grouped = new Map(read.flatMap(([ms, traces]) => (traces === undefined ? [] : [[ms, Telemetry.calls(blueprint, traces, live.environment, { since: live.now - ms, now: live.now })] as const])));
    const callsIn = (ms: number) => grouped.get(ms);
    const issues = yield* keep(blueprint, live, callsIn(live.windowMs), ledger);
    return { environment: live.environment, now: live.now, alerts: evaluate(rules, (ms) => (ms <= reach ? callsIn(ms) : undefined)), issues };
  });

export const Monitor: MonitorApi = { read };
