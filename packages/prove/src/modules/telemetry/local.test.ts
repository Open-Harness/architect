import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { expect, it } from "vitest";
import { Collectors } from "./service.ts";

it("accepts local OTLP and strips private attributes before writing its files", () =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const dir = yield* Effect.acquireRelease(
      Effect.sync(() => mkdtempSync(join(tmpdir(), "ortho-otlp-"))),
      (path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
    );
    const collector = yield* Collectors.local(dir, ["payload.private"]);
    const post = (body: string, signal = "traces") => Effect.promise(() => fetch(`${collector.url}/v1/${signal}`, { method: "POST", body }));
    expect((yield* post('{"resourceSpans":"bad"}')).status).toBe(400);
    const traceId = "00000000000000000000000000000001";
    const attr = (key: string, stringValue: string) => ({ key, value: { stringValue } });
    const span = {
      traceId, spanId: "0000000000000001", name: "test", startTimeUnixNano: "1", endTimeUnixNano: "2",
      attributes: [attr("payload.private", "private-field"), attr("user.id", "private-person"), attr("visible", "kept")],
    };
    const resource = { attributes: [attr("organization.id", "private-organization")] };
    expect((yield* post(JSON.stringify({ resourceSpans: [{ resource, scopeSpans: [{ spans: [span] }] }] }))).status).toBe(200);
    expect((yield* collector.find(traceId))?.spans[0]?.attrs).toEqual({ visible: "kept" });
    expect(readFileSync(join(dir, "traces.jsonl"), "utf8")).not.toContain("private-");
    expect((yield* post(JSON.stringify({ resourceMetrics: [{ resource }] }), "metrics")).status).toBe(200);
    expect(readFileSync(join(dir, "metrics.jsonl"), "utf8")).not.toContain("private-");
  }))),
);
