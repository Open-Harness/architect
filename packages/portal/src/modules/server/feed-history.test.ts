// M1.49 (#541): the monitor's history is what the feed really holds, not the Calls page's display window. Judged at the server, through a feed.
import { createServer } from "node:http";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { PortalServer } from "#modules/server/service.js";
import { acmeModel, blueprintOf } from "#modules/wire/testing.js";

const NOW = 1_800_000_000_000;
const MIN = 60_000;
const OP = "allowance.get";
const DISPLAY = 30 * MIN;

const raw = () => {
  const model = acmeModel();
  const alertRules = [{
    id: `latency:${OP}`, kind: "latency", labels: { environment: "*", operation: OP, severity: "page", owner: "blueprint" },
    target: 0.9, windowDays: 28, thresholdMs: 100, minCalls: 2, alerts: [{ name: "fast", burn: 2, windowsMs: [60 * MIN, 5 * MIN], severity: "page" }],
  }];
  return blueprintOf({ ...model, alertRules } as unknown as typeof model);
};
const call = (n: number, minutesAgo: number, ms: number) => [`t${n}`, { logs: [], spans: [{ spanId: `s${n}`, parentSpanId: "", name: OP, ms, start: NOW - minutesAgo * MIN, status: 1, attrs: { operation: OP, attempt: 1 } }] }] as const;
// Two slow calls a minute ago; twenty fast ones 45 minutes ago, inside the hour but outside the Calls page's half hour.
const traces = Object.fromEntries([call(1, 1, 500), call(2, 1, 500), ...Array.from({ length: 20 }, (_, i) => call(i + 10, 45, 10))]);

const ask = async (historyMs: number) => {
  const feed = { environment: "local", now: NOW, windowMs: DISPLAY, historyMs, traces: { state: "available", value: traces }, points: { state: "available", value: [] } };
  const server = createServer((_, response) => { response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(feed)); });
  await new Promise<void>((done) => { server.listen(0, "127.0.0.1", done); });
  try {
    const blueprint = raw();
    const env = { ORTHO_PORTAL_FEED: `http://127.0.0.1:${(server.address() as { port: number }).port}/` };
    const get = async (path: string) => (await Effect.runPromise(PortalServer.serve(blueprint, new Request(`http://portal/_portal/v1/${path}?digest=${blueprint.digest}`), env))).json() as Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { monitor: await get("monitor"), snapshot: await get("snapshot") };
  } finally { server.close(); }
};

describe("the monitor's history comes from the feed, apart from the Calls page's window", () => {
  it("a feed that holds the hour evaluates a one hour burn window (it is not unknown)", async () => {
    const { monitor } = await ask(3 * 24 * 60 * MIN);
    expect(monitor.alerts[0]).toMatchObject({ rule: `latency:${OP}`, state: "ok", windows: [{ ms: 60 * MIN, calls: 22, bad: 2 }, { ms: 5 * MIN, calls: 2, bad: 2 }] });
  });

  it("a feed that holds less than the window leaves the alert unknown, never judged on the part", async () => {
    const { monitor } = await ask(10 * MIN);
    expect(monitor.alerts[0]).toEqual({ rule: `latency:${OP}`, alert: "fast", state: "unknown", severity: "page" });
  });

  it("the Calls page keeps its own 30 minutes whatever the history", async () => {
    const { snapshot } = await ask(3 * 24 * 60 * MIN);
    expect(snapshot.telemetry.windowMs).toBe(DISPLAY);
    expect(snapshot.telemetry.since).toBe(NOW - DISPLAY);
    expect(snapshot.telemetry.calls.value.rows.map((r: { trace: string }) => r.trace).sort()).toEqual(["t1", "t2"]);
  });
});
