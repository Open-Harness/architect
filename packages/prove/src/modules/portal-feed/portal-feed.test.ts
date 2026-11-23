// M1.13: a real run lights its own portal. A local world on workerd makes one call; that same world's `/_portal/v1/snapshot` carries the call under
// `telemetry`, read from the world's own collector through the feed, and its trace page shows the call's structure and nothing else.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { acmeCopy } from "../../../test/acme.ts";
import { Collectors, FileMetrics } from "#modules/telemetry/service.js";
import { Worlds } from "#modules/world/service.js";
import { SourceFailed } from "#modules/telemetry/types.js";
import { PortalFeed } from "./service.ts";

const project = acmeCopy();
const telemetry = mkdtempSync(join(tmpdir(), "portal-feed-"));
afterAll(() => { project.remove(); rmSync(telemetry, { recursive: true, force: true }); });
const sleep = (ms: number) => new Promise<void>((done) => { setTimeout(done, ms); });

interface Snapshot { readonly observedAt: string; readonly telemetry: null | { readonly environment: string; readonly now: number; readonly calls: { readonly state: string; readonly value?: { readonly rows: ReadonlyArray<{ readonly trace: string; readonly operation: string; readonly outcome: string; readonly caller: string }> } }; readonly metrics: { readonly state: string; readonly value?: { readonly operations: Record<string, { readonly calls: number; readonly answered: number }> } } } }

describe("the feed keeps each source's answer on its own", () => {
  it("metrics that fail beside traces that read: the traces are still there", () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const source = { traces: () => Effect.succeed(new Map()), find: () => Effect.succeed(undefined), window: () => Effect.succeed(new Map([["t", { spans: [], logs: [] }]])) };
      const feed = yield* PortalFeed.serve({ source, metrics: { window: () => Effect.fail(new SourceFailed({ message: "unreadable" })) }, environment: "local", windowMs: 1000, now: Effect.succeed(5) });
      const answer = yield* Effect.promise(() => fetch(feed.url).then((r) => r.json()));
      expect(answer).toEqual({ environment: "local", now: 5, windowMs: 1000, historyMs: 0, traces: { state: "available", value: { t: { spans: [], logs: [] } } }, points: { state: "unavailable", reason: "unreadable" } });
    }))));
});

describe("the feed says how much history it really holds", () => {
  const MIN = 60_000;
  it("the least of the cap and how long it has held the source; the display window stays its own", () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      let clock = 1_000_000;
      const asked: number[] = [];
      const source = { traces: () => Effect.succeed(new Map()), find: () => Effect.succeed(undefined), window: (since: number) => { asked.push(since); return Effect.succeed(new Map()); } };
      const feed = yield* PortalFeed.serve({ source, metrics: { window: () => Effect.succeed([]) }, environment: "local", windowMs: 30 * MIN, historyMs: 3 * 60 * MIN, now: Effect.sync(() => clock) });
      const read = () => Effect.promise(() => fetch(feed.url).then((r) => r.json() as Promise<{ windowMs: number; historyMs: number }>));
      clock += 10 * MIN;
      expect(yield* read(), "ten minutes old: ten minutes held").toMatchObject({ windowMs: 30 * MIN, historyMs: 10 * MIN });
      clock += 110 * MIN;
      expect(yield* read(), "two hours old: two hours held, and the traces were read that far").toMatchObject({ windowMs: 30 * MIN, historyMs: 120 * MIN });
      expect(asked.at(-1)).toBe(120 * MIN);
      clock += 600 * MIN;
      expect(yield* read(), "older than the cap: the cap").toMatchObject({ historyMs: 180 * MIN });
    }))));
});

describe("a local world's portal", () => {
  it("carries the world's own call: the row, the count, and a trace page of structure only", { timeout: 120_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.local(telemetry, []);
      const feed = yield* PortalFeed.serve({ source: collector, metrics: FileMetrics.open(telemetry), environment: "local", windowMs: 30 * 60_000 });
      const { url } = yield* Worlds.start({ root: project.root, port: 0, name: "feed-test", otlp: collector.url, portalFeed: feed.url });
      const cast = yield* Effect.promise(() => fetch(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names: ["ada"] }) }).then((r) => r.json() as Promise<Record<string, { token: string }>>));
      const called = yield* Effect.promise(() => fetch(`${url}/organization/create`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${cast["ada"]!.token}` }, body: JSON.stringify({ name: "Feed Test", cap: "1000" }) }));
      expect(called.status).toBe(200);

      const digest = yield* Effect.promise(() => fetch(`${url}/_portal/v1/blueprint`).then((r) => r.json() as Promise<{ digest: string }>).then((b) => b.digest));
      const snapshot = () => fetch(`${url}/_portal/v1/snapshot?digest=${digest}`).then((r) => r.json() as Promise<Snapshot>);
      // The Worker exports its spans and metrics after the call answers: read until both are in.
      let seen: Snapshot | undefined;
      for (let i = 0; i < 60; i++) {
        const now = yield* Effect.promise(snapshot);
        const rows = now.telemetry?.calls.value?.rows ?? [];
        if (rows.some((r) => r.operation === "organization.create") && (now.telemetry?.metrics.value?.operations["organization.create"]?.calls ?? 0) > 0) { seen = now; break; }
        yield* Effect.promise(() => sleep(500));
      }
      expect(seen, "the call reached the portal's telemetry").toBeDefined();
      const t = seen!.telemetry!;
      expect(t.environment).toBe("local");
      expect(seen!.observedAt, "the portal's only clock is the feed's now").toBe(new Date(t.now).toISOString());
      const row = t.calls.value!.rows.find((r) => r.operation === "organization.create")!;
      expect([row.outcome, row.caller]).toEqual(["answered", "person"]);
      expect(t.metrics.value!.operations["organization.create"]).toMatchObject({ calls: 1, answered: 1 });

      const page = yield* Effect.promise(() => fetch(`${url}/_portal/v1/traces/${row.trace}`).then((r) => r.text()));
      expect(JSON.parse(page)).toMatchObject({ state: "available", value: { trace: row.trace } });
      expect(page).not.toContain("Feed Test");
    }))));
});
