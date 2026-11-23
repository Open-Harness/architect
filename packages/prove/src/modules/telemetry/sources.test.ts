// The two TraceSources' `window`: FileSource over a folder of the Collector's files, AxiomSource over a stand-in for Axiom's
// query API on this machine (never Axiom: that is sources.live.test.ts, behind ORTHO_LIVE_AXIOM=1).
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { AxiomSource, FileSource } from "./service.ts";
import { arrived } from "./internal/otlp.ts";

const dir = mkdtempSync(join(tmpdir(), "sources-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const kv = (key: string, value: string) => ({ key, value: { stringValue: value } });
const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);

describe("FileSource.window", () => {
  it("returns the traces that have spans newer than the window, whole", async () => {
    const old = "a".repeat(32);
    const fresh = "b".repeat(32);
    const at = (ms: number) => String(BigInt(ms) * 1_000_000n);
    const span = (trace: string, id: string, ms: number) => ({ traceId: trace, spanId: id, parentSpanId: "", name: "allowance.spend", kind: 1, startTimeUnixNano: at(ms), endTimeUnixNano: at(ms + 5), attributes: [kv("operation", "allowance.spend")], status: { code: 1 } });
    mkdirSync(join(dir, "files"), { recursive: true });
    writeFileSync(join(dir, "files/traces.jsonl"), [
      { resourceSpans: [{ scopeSpans: [{ spans: [span(old, "0000000000000001", NOW - 3 * 3_600_000), span(fresh, "0000000000000002", NOW - 60_000), span(fresh, "0000000000000003", NOW - 59_000)] }] }] },
    ].map((d) => JSON.stringify(d)).join("\n") + "\n");
    const got = await Effect.runPromise(FileSource.open(join(dir, "files")).window(3_600_000, NOW));
    expect([...got.keys()]).toEqual([fresh]);
    expect(got.get(fresh)!.spans).toHaveLength(2);
  });
});

/** A stand-in for Axiom's query API: it keeps each query it is sent and answers with the tabular shape. */
const standIn = (answer: (apl: string) => { fields: Array<{ name: string }>; columns: Array<Array<unknown>> }) =>
  new Promise<{ base: string; seen: Array<{ apl: string; authorization: string | undefined; org: string | undefined; url: string }>; close: () => void }>((done) => {
    const seen: Array<{ apl: string; authorization: string | undefined; org: string | undefined; url: string }> = [];
    const server = createServer((req, res) => {
      const chunks: Array<Buffer> = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const apl = (JSON.parse(Buffer.concat(chunks).toString("utf8")) as { apl: string }).apl;
        seen.push({ apl, authorization: req.headers.authorization, org: req.headers["x-axiom-org-id"] as string | undefined, url: req.url ?? "" });
        res.setHeader("content-type", "application/json").end(JSON.stringify({ tables: [answer(apl)] }));
      });
    });
    server.listen(0, "127.0.0.1", () => done({ base: `http://127.0.0.1:${(server.address() as { port: number }).port}`, seen, close: () => server.close() }));
  });

const FIELDS = ["name", "ms", "status.code", "_time", "attributes.custom", "trace_id", "span_id", "parent_span_id"].map((name) => ({ name }));
const TRACE = "c".repeat(32);
const rows = [
  ["allowance.spend", 7.5, "OK", "2026-11-17T11:59:00.250Z", { operation: "allowance.spend", refusal: "AllowanceExceeded" }, TRACE, "00000000000000b2", "00000000000000b1"],
  ["POST", 9, "UNSET", "2026-11-17T11:59:00.240Z", {}, TRACE, "00000000000000b1", ""],
];
const columns = FIELDS.map((_, i) => rows.map((r) => r[i]));

describe("a call the server refuses before any span opens (O2, gap 3)", () => {
  const parent = "00000000000000aa";
  const root = { traceId: "c".repeat(32), spanId: "0000000000000001", parentSpanId: parent, name: "allowance.get", start: 0, end: 1, attrs: {}, events: [], status: "ok" };
  const orphan = { ...root, spanId: "0000000000000002", parentSpanId: "00000000000000ff" };

  it("arrived: an empty trace is whole only when nothing may come; one with spans is judged as any other", () => {
    expect(arrived(undefined, { trace: root.traceId, parent })).toBe(false);
    expect(arrived(undefined, { trace: root.traceId, parent, mayBeEmpty: true })).toBe(true);
    expect(arrived({ spans: [], logs: [] }, { trace: root.traceId, parent, mayBeEmpty: true })).toBe(true);
    expect(arrived({ spans: [root as never], logs: [] }, { trace: root.traceId, parent, mayBeEmpty: true })).toBe(true);
    // The handler ran after all and its spans are still landing: wait for them, so a "span absent" check can see them.
    expect(arrived({ spans: [orphan as never], logs: [] }, { trace: root.traceId, parent, mayBeEmpty: true })).toBe(false);
  });

  it("FileSource.traces does not wait ten seconds for a trace that may be empty", { timeout: 15_000 }, async () => {
    const folder = join(dir, "refused");
    mkdirSync(folder, { recursive: true });
    const came = "d".repeat(32);
    const span = { traceId: came, spanId: "0000000000000003", parentSpanId: parent, name: "allowance.spend", kind: 1, startTimeUnixNano: "1000000", endTimeUnixNano: "6000000", attributes: [], status: { code: 1 } };
    writeFileSync(join(folder, "traces.jsonl"), JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] }) + "\n");
    const refused = "e".repeat(32);
    const started = performance.now();
    const got = await Effect.runPromise(FileSource.open(folder).traces([{ trace: came, parent }, { trace: refused, parent, mayBeEmpty: true }]));
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(got.get(came)!.spans).toHaveLength(1);
    expect(got.get(refused)).toEqual({ spans: [], logs: [] });
  });
});

describe("AxiomSource", () => {
  it("asks APL for the environment's spans in the window, with the query token and the organisation, and reads Axiom's columns back as spans", async () => {
    const edge = await standIn((apl) => (apl.includes("-logs") ? { fields: ["body", "trace_id", "span_id"].map((name) => ({ name })), columns: [["the amount is more than is left"], [TRACE], ["00000000000000b2"]] } : { fields: FIELDS, columns }));
    try {
      const source = await Effect.runPromise(AxiomSource.open({ group: "capxul-real", environment: "staging", env: { AXIOM_QUERY_TOKEN: "stand-in-query-token", AXIOM_DOMAIN: edge.base, AXIOM_ORG_ID: "org-1" } }));
      const got = await Effect.runPromise(source.window(3_600_000));
      const trace = got.get(TRACE)!;
      expect(trace.spans.map((s) => s.name).sort()).toEqual(["POST", "allowance.spend"]);
      const op = trace.spans.find((s) => s.name === "allowance.spend")!;
      expect(op).toMatchObject({ ms: 7.5, status: 1, parentSpanId: "00000000000000b1", attrs: { refusal: "AllowanceExceeded" }, start: Date.parse("2026-11-17T11:59:00.250Z") });
      expect(trace.spans.find((s) => s.name === "POST")!.status).toBe(0);
      expect(trace.logs.map((l) => l.body)).toEqual(["the amount is more than is left"]);

      const [spans, logs] = edge.seen;
      expect(spans!.url).toContain("/v1/query/_apl");
      expect(spans!.authorization).toBe("Bearer stand-in-query-token");
      expect(spans!.org).toBe("org-1");
      expect(spans!.apl).toContain("['capxul-real-traces']");
      expect(spans!.apl).toContain("ago(3600s)");
      expect(spans!.apl).toContain("['resource.custom']['deployment.environment'] == 'staging'");
      expect(logs!.apl).toContain("['capxul-real-logs']");
      expect(logs!.apl).toContain(TRACE); // logs only for the traces that were refused
    } finally {
      edge.close();
    }
  });

  it("names the missing item, never a value, when there is no token or no edge; and refuses a name that is not a name", async () => {
    const none = await Effect.runPromise(AxiomSource.open({ group: "capxul-real", environment: "staging", env: {}, read: () => Effect.succeed(undefined) }).pipe(Effect.flip));
    expect(none.message).toContain("AXIOM_QUERY_TOKEN");
    expect(none.message).toContain("capxul-query");
    const noEdge = await Effect.runPromise(AxiomSource.open({ group: "capxul-real", environment: "staging", env: { AXIOM_QUERY_TOKEN: "t" }, read: () => Effect.succeed(undefined) }).pipe(Effect.flip));
    expect(noEdge.message).toContain("axiom-domain");
    const odd = await Effect.runPromise(AxiomSource.open({ group: "x'] | drop", environment: "staging", env: { AXIOM_QUERY_TOKEN: "t", AXIOM_DOMAIN: "x" } }).pipe(Effect.flip));
    expect(odd.message).toContain("isn't a dataset group");
  });

  it("says what Axiom answered when it refuses, without the token", async () => {
    const edge = await new Promise<{ base: string; close: () => void }>((done) => {
      const server = createServer((_req, res) => res.writeHead(401).end("bad token"));
      server.listen(0, "127.0.0.1", () => done({ base: `http://127.0.0.1:${(server.address() as { port: number }).port}`, close: () => server.close() }));
    });
    try {
      const source = await Effect.runPromise(AxiomSource.open({ group: "capxul-real", environment: "staging", env: { AXIOM_QUERY_TOKEN: "stand-in-query-token", AXIOM_DOMAIN: edge.base } }));
      const failure = await Effect.runPromise(source.window(60_000).pipe(Effect.exit));
      expect(JSON.stringify(failure)).toContain("401");
      expect(JSON.stringify(failure)).not.toContain("stand-in-query-token");
    } finally {
      edge.close();
    }
  });
});
