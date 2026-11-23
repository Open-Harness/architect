import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect } from "effect";
import { expect, it } from "vitest";
import { Names } from "orthograph/server";
import { castPeople } from "#modules/journeys/internal/world.js";
import { Collectors } from "#modules/telemetry/service.js";
import { Worlds } from "#modules/world/service.js";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

interface Point {
  readonly attributes: ReadonlyArray<{ readonly key: string; readonly value: { readonly stringValue: string } }>;
  readonly asInt?: string;
  readonly asDouble?: number;
  readonly count?: string;
  readonly sum?: number;
}

interface Metric {
  readonly name: string;
  readonly unit?: string;
  readonly sum?: { readonly dataPoints: ReadonlyArray<Point> };
  readonly histogram?: { readonly dataPoints: ReadonlyArray<Point> };
}

const pointsFor = (dir: string, operation: string) => {
  const file = join(dir, "metrics.jsonl");
  if (!existsSync(file)) return [];
  const metrics = readFileSync(file, "utf8").split("\n").slice(0, -1).filter(Boolean).flatMap((line): ReadonlyArray<Metric> => {
    const doc = JSON.parse(line) as { resourceMetrics: Array<{ scopeMetrics: Array<{ metrics: Array<Metric> }> }> };
    return doc.resourceMetrics.flatMap((r) => r.scopeMetrics.flatMap((s) => s.metrics));
  });
  return metrics.flatMap((metric) => (metric.sum?.dataPoints ?? metric.histogram?.dataPoints ?? []).flatMap((point) => {
    const labels = Object.fromEntries(point.attributes.map(({ key, value }) => [key, value.stringValue]));
    return labels["operation"] === operation ? [{ name: metric.name, unit: metric.unit, labels, point }] : [];
  }));
};

const post = (url: string, route: string, body: object, token: string) => {
  const trace = randomBytes(16).toString("hex");
  const parent = randomBytes(8).toString("hex");
  return Effect.promise(() => fetch(`${url}/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, traceparent: `00-${trace}-${parent}-01` },
    body: JSON.stringify(body),
  })).pipe(Effect.map((response) => ({ response, trace, parent })));
};

it("exports two pre-handler refusals and their durations from a real world", { timeout: 120_000 }, () =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const dir = yield* Effect.acquireRelease(Effect.sync(() => mkdtempSync(join(tmpdir(), "ortho-call-metrics-"))), (path) =>
      Effect.sync(() => {
        rmSync(path, { recursive: true, force: true });
        rmSync(join(acme, Names.folder, basename(path)), { recursive: true, force: true });
      }));
    const collector = yield* Collectors.start(dir);
    const { url } = yield* Worlds.start({ root: acme, port: 0, name: basename(dir), otlp: collector.url });
    const people = yield* castPeople(url, ["ada", "olga", "bob"]);
    const orgCall = yield* post(url, "organization/create", { name: "Metrics test", cap: "1000" }, people["ada"]!.token!);
    expect(orgCall.response.status).toBe(200);
    const { organization } = (yield* Effect.promise(() => orgCall.response.json())) as { organization: string };
    const grant = yield* post(url, "allowance/grant", { organization, member: people["olga"]!.person, limit: "500" }, people["ada"]!.token!);
    expect(grant.response.status).toBe(200);
    const { allowance } = (yield* Effect.promise(() => grant.response.json())) as { allowance: string };

    const bad = yield* post(url, "allowance/spend", { allowance, amount: "invalid", memo: "malformed spend" }, people["olga"]!.token!);
    const stranger = yield* post(url, "allowance/spend", { allowance, amount: "5", memo: "stranger spend" }, people["bob"]!.token!);
    expect(bad.response.status).toBe(400);
    expect(stranger.response.status).toBe(403);

    // Give both refused trace ids the collector's full observation window. The grant is a positive control.
    const traces = yield* collector.traces([grant, bad, stranger]);
    expect(traces.get(grant.trace)?.spans.some((span) => span.name === "allowance.grant")).toBe(true);
    const all = pointsFor(dir, "allowance.spend");
    const calls = all.filter((p) => p.name === "ortho.calls").map(({ labels, point }) => ({ labels, count: Number(point.asInt ?? point.asDouble) }));
    const counted = calls.filter(({ count }) => count !== 0);
    expect(counted).toEqual(expect.arrayContaining([
      { labels: { operation: "allowance.spend", outcome: "refused", refusal: "InvalidPayload", "principal.kind": "person" }, count: 1 },
      { labels: { operation: "allowance.spend", outcome: "refused", refusal: "NotAllowed", "principal.kind": "person" }, count: 1 },
    ]));
    expect(counted).toHaveLength(2);
    const durations = all.filter((p) => p.name === "ortho.call.duration");
    expect(durations.reduce((n, { point }) => n + Number(point.count), 0)).toBe(2);
    for (const { labels, point, unit } of durations) {
      expect(unit).toBe("ms");
      expect(labels).toEqual({ operation: "allowance.spend", unit: "ms" });
      expect(point.sum ?? 0).toBeGreaterThanOrEqual(0);
    }
    expect(traces.get(bad.trace)?.spans).toEqual([]);
    // A refusal by the role check opens no operation span, only `<operation>.refused`, which names the refusal (M1.36).
    expect(traces.get(stranger.trace)?.spans.map((span) => [span.name, span.attrs["refusal"]])).toEqual([["allowance.spend.refused", "NotAllowed"]]);
  }))));
