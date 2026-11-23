import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
import { collectorBinary } from "./internal/binary.ts";
import { Collectors } from "./service.ts";
import { runCollector, terminate } from "./internal/process.ts";
import { alive, commandOf, markers, record } from "./internal/runs.ts";
import { collectorConfig } from "./internal/config.ts";

const dir = resolve(import.meta.dirname, "../../../test/tmp/collector");
const hex = (n: number) => Array.from({ length: n }, (_, i) => ((i * 7 + 3) % 16).toString(16)).join("");

describe("the collector, as a process", () => {
  // The first run on a machine fetches the pinned binary (about 100 MB) once; every later one finds it in the cache.
  beforeAll(() => Effect.runPromise(collectorBinary), 900_000);

  it("takes an OTLP span over HTTP and reads it back by trace id once complete", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.start(dir);
      const trace = hex(32);
      const parent = "00000000000000aa";
      const span = (id: string, parentId: string, name: string) => ({
        traceId: trace, spanId: id, parentSpanId: parentId, name, kind: 2,
        startTimeUnixNano: "1000000000", endTimeUnixNano: "1005000000",
        attributes: [{ key: "answer.allowance", value: { intValue: "500" } }],
      });
      const body = { resourceSpans: [{ resource: { attributes: [] }, scopeSpans: [{ spans: [span("00000000000000b1", parent, "POST /allowance/grant"), span("00000000000000b2", "00000000000000b1", "allowance.grant")] }] }] };
      const sent = yield* Effect.promise(() => fetch(`${collector.url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      expect(sent.status).toBe(200);
      const got = (yield* collector.traces([{ trace, parent }])).get(trace)!;
      expect(got.spans.map((s) => s.name).sort()).toEqual(["POST /allowance/grant", "allowance.grant"]);
      expect(got.spans.find((s) => s.name === "allowance.grant")!.attrs["answer.allowance"]).toBe(500);
      expect(got.spans[0]!.ms).toBe(5);
    }))),
  );

  it("drops the person from a record before anything else sees it: user.*, organization.id, on spans and resources", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.start(dir);
      const trace = hex(32);
      const kv = (key: string) => ({ key, value: { stringValue: "someone@example.com" } });
      const body = { resourceSpans: [{
        resource: { attributes: [kv("service.name"), kv("user.email"), kv("organization.id")] },
        scopeSpans: [{ spans: [{ traceId: trace, spanId: "00000000000000c1", parentSpanId: "", name: "agent", kind: 1, startTimeUnixNano: "1", endTimeUnixNano: "2", attributes: [kv("user.email"), kv("user.account_uuid"), kv("user.account_id"), kv("organization.id"), kv("tool")] }] }],
      }] };
      yield* Effect.promise(() => fetch(`${collector.url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      const got = (yield* collector.traces([{ trace, parent: "00000000000000c1" }])).get(trace)!;
      const span = got.spans.find((s) => s.name === "agent")!;
      expect(Object.keys(span.attrs)).toEqual(["tool"]);
      expect(readFileSync(`${dir}/traces.jsonl`, "utf8")).not.toMatch(/user\.|organization\.id/);
    }))),
  );

  it("is a process of this one's, and it and its marker are gone once the scope ends", { timeout: 60_000 }, async () => {
    const pids: Array<number> = [];
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.start(dir);
      expect(collector.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      pids.push(...markers("collector").filter((m) => m.owner === process.pid).map((m) => m.pid));
      expect(pids).toHaveLength(1);
      expect(alive(pids[0]!)).toBe(true);
    })));
    expect(alive(pids[0]!)).toBe(false);
    expect(markers("collector").filter((m) => m.pid === pids[0])).toEqual([]);
  });

  it("stops a collector whose owner process is gone at the next start, and leaves a live owner's alone", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      // A process that has exited: its pid is a dead owner. Another is this process: a live one.
      const deadPid = spawnSync(process.execPath, ["-e", ""]).pid;
      const spare = resolve(import.meta.dirname, "../../../test/tmp/orphans");
      const [orphanDir, liveDir] = [`${spare}/orphan`, `${spare}/live`];
      for (const d of [orphanDir, liveDir]) mkdirSync(d, { recursive: true });
      const orphan = (yield* runCollector(orphanDir, { strip: [] }, true)).marker;
      record({ ...orphan, owner: deadPid });
      const live = (yield* runCollector(liveDir, { strip: [] }, true)).marker;
      expect(commandOf(orphan.pid)).toContain("otelcol-contrib");
      yield* Collectors.start(dir);
      expect(alive(orphan.pid)).toBe(false);
      expect(alive(live.pid)).toBe(true);
      yield* terminate(live);
      expect(alive(live.pid)).toBe(false);
    }))),
  );

  it("never signals a process that only has the same PID: a marker whose command no longer matches is dropped", { timeout: 30_000 }, () =>
    Effect.runPromise(Effect.gen(function* () {
      const bystander = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
      try {
        yield* terminate({ kind: "collector", pid: bystander.pid!, owner: 0, command: "/nowhere/otelcol-contrib --config file:/nowhere" });
        expect(alive(bystander.pid!)).toBe(true);
      } finally { bystander.kill(); }
    })),
  );

  it("writes a config that listens on loopback, writes files and leaves its own metrics port unbound", () => {
    const config = collectorConfig({ strip: ["token"], port: 4999, dir: "/out" });
    expect(config).toContain("endpoint: 127.0.0.1:4999");
    expect(config).toContain('path: "/out/traces.jsonl"');
    expect(config).toContain("level: none");
    expect(config).toContain('- key: "token"');
  });
});
