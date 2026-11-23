// Check 17 (M1.36): telemetry carries the model (K12 section 2). Real workerd worlds over acme and over a fixture, with
// `Collectors.local` as the Collector (prove's own loopback OTLP/HTTP receiver, port from the OS): no Docker. Each value is
// read from the Collector's files for one call that moves, emits and is refused, and for one slowed past its budget, and is
// judged against the compiled model (`generated/model/model.json`), never against a literal the builder could hard-code.
//
// The calls (acme, `allowance`): olga spends 120 (moves from `active`, emits `AllowanceSpent`), then 400 (refused
// `AllowanceExceeded`, AL-001), then the remaining 380 (moves from `active` to `exhausted`); ada revokes (moves from
// `exhausted`, emits `AllowanceRevoked`); olga spends again (refused by the machine, `AllowanceNotActive`, AL-900).
// The slow call is `lamp.glow` (fixture `e2e/fixtures/m1/telemetry-model`, overlaid on acme): declared `budget.p95` of 500 ms,
// its `wait` step held by an HTTP gate of this file for 1.2 s, then a second call with the gate open. No clock is in the
// handler: the gate holds it, and the check judges the counter, not timing precision.
//
// Assumptions beyond K12 section 2, where the design is silent:
//  1. Every attribute but the counter's is written on the operation's span, except `event.name`, which K12 puts on the
//     commit span (`<operation>.commit`). Where the check says "on the operation span" it also finds none on the commit span
//     of a refused call: a refusal comes before the commit, so there is no commit span and no `event.name` at all.
//  2. `move.from` is the state the subject was in when the move was made (the state `checkFrom` read), not the move's declared
//     `from` list: acme's `revoke` is declared from `active` or `exhausted` and, after the last spend, the span says `exhausted`.
//     A move that creates (`from: []`) is not judged.
//  3. `refusal.code` is the model's code for the refusal named in `refusal`: a declared error's from `things.<thing>.errors`, the
//     machine's from `things.<thing>.machine.notFrom.code`. A call that was not refused has no `refusal.code`. A refusal before
//     the span opens (a role, a payload) has no span, as M1.20 says, so none is judged here.
//  4. `ortho.budget.breaches` is a counter of calls, one per call that took longer than `budget.p95Ms`, with exactly the
//     attribute `operation` (as `ortho.call.duration` has `operation` and `unit`). An operation that declares no budget never
//     counts; a call inside its budget adds nothing. It is exported with `ortho.calls` and `ortho.call.duration` to
//     `metrics.jsonl`.
//  5. `environment` is the world's environment (`Worlds.start`'s, `local` by default) and `store` the kind of the store the
//     call's thing lives in (`things.<thing>.lives`, `database` for acme and the fixture), both plain span attributes (the
//     resource's `deployment.environment` stays as it is) on the operation span of every call that opens one.
//  6. The journeys' rule: the fixture's one journey passes with its handler and fails with empty handlers (`ortho prove --empty`).
//
// Red today on the missing surface only: `move.from`, `event.name` on the commit span, `refusal.code`, `ortho.budget.breaches`,
// `environment` and `store` are not written. The controls, true today, say the spans, the commit span, `refusal`, `move.name`,
// `move.to`, `ortho.calls` and `ortho.call.duration` are.
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Collectors, Worlds, type Span } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, fixtures, model, nothingRunning, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) await stop();
  for (const copy of copies.splice(0)) copy.remove();
});

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** Poll `read` until `done` holds, or give up after `ms` and return what it last saw. */
const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 20_000) => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await sleep(60); last = await read(); }
  return last;
};
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as AddressInfo; server.close(() => resolve(port)); });
});

/** An HTTP service whose `/gate/glow` is held until `open()` when closed, and answered at once otherwise. */
const gate = async () => {
  let closed = false;
  const held: Array<ServerResponse> = [];
  const server = createServer((_request, response) => { if (closed) held.push(response); else response.end("open"); });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const open = () => { closed = false; for (const response of held.splice(0)) response.end("open"); };
  stops.push(() => new Promise<void>((resolve) => { open(); server.closeAllConnections(); server.close(() => resolve()); }));
  return { origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => { closed = true; }, open, waiting: () => held.length };
};

// ---- the world, the calls, and what the Collector's files hold ----

interface Called { readonly trace: string; readonly status: number; readonly body: Record<string, unknown> }
interface Seen {
  readonly cast: (...names: ReadonlyArray<string>) => Promise<Record<string, { readonly person: string; readonly token: string }>>;
  readonly call: (route: string, token: string | undefined, body: object) => Promise<Called>;
  /** Spans of a trace as the Collector's file has them now. */
  readonly spans: (trace: string) => Promise<ReadonlyArray<Span>>;
  readonly metrics: () => ReadonlyArray<Point>;
}
interface Point { readonly name: string; readonly unit?: string; readonly labels: Record<string, string>; readonly count?: number; readonly value: number }

const inWorld = <A>(root: string, use: (seen: Seen) => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), "ortho-m1-telemetry-model-"));
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    const collector = yield* Collectors.local(dir, []);
    const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name: "m1-telemetry-model", otlp: collector.url });
    const seen: Seen = {
      cast: async (...names) => (await (await fetch(`${world.url}/_world/cast`, { method: "POST", body: JSON.stringify({ names }) })).json()) as never,
      call: async (route, token, body) => {
        const trace = randomBytes(16).toString("hex");
        const response = await fetch(`${world.url}/${route}`, {
          method: "POST",
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), traceparent: `00-${trace}-${randomBytes(8).toString("hex")}-01` },
          body: JSON.stringify(body),
        });
        return { trace, status: response.status, body: (await response.json()) as Record<string, unknown> };
      },
      spans: (trace) => Effect.runPromise(collector.find(trace)).then((found) => found?.spans ?? []),
      metrics: () => pointsIn(dir),
    };
    return yield* Effect.promise(() => use(seen));
  })));

interface RawPoint { readonly attributes: ReadonlyArray<{ readonly key: string; readonly value: { readonly stringValue?: string } }>; readonly asInt?: string; readonly asDouble?: number; readonly count?: string; readonly sum?: number }
interface RawMetric { readonly name: string; readonly unit?: string; readonly sum?: { readonly dataPoints: ReadonlyArray<RawPoint> }; readonly histogram?: { readonly dataPoints: ReadonlyArray<RawPoint> } }
/** Every data point `metrics.jsonl` holds, in the order exported (a counter's point is its `asInt`; a histogram's has `count` and `sum`). */
const pointsIn = (dir: string): ReadonlyArray<Point> => {
  const file = join(dir, "metrics.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    const doc = JSON.parse(line) as { resourceMetrics: Array<{ scopeMetrics: Array<{ metrics: Array<RawMetric> }> }> };
    return doc.resourceMetrics.flatMap((r) => r.scopeMetrics.flatMap((s) => s.metrics)).flatMap((metric) =>
      (metric.sum?.dataPoints ?? metric.histogram?.dataPoints ?? []).map((point) => ({
        name: metric.name,
        ...(metric.unit === undefined ? {} : { unit: metric.unit }),
        labels: Object.fromEntries(point.attributes.map(({ key, value }) => [key, value.stringValue ?? ""])),
        ...(point.count === undefined ? {} : { count: Number(point.count) }),
        value: Number(point.asInt ?? point.asDouble ?? point.sum ?? 0),
      })));
  });
};

const named = (spans: ReadonlyArray<Span>, name: string) => spans.find((span) => span.name === name);
/** The spans of a call once its operation span is there (and its commit span, for a call that commits). */
const settled = async (seen: Seen, trace: string, operation: string, commits: boolean) =>
  until(() => seen.spans(trace), (spans) => named(spans, operation) !== undefined && (!commits || named(spans, `${operation}.commit`) !== undefined));

// ---- the project, and the model the values are judged against ----

const acmeProject = () => { const copy = copyOf(acme); copies.push(copy); return copy.root; };
const lampProject = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(join(fixtures, "telemetry-model"), copy.root, { recursive: true });
  succeeds(copy.root, "generate");
  return copy.root;
};

/** What acme's model says about `allowance`: the moves, the errors' codes, the machine's refusal, where it lives. */
const allowanceModel = (root: string) => {
  const m = model(root) as unknown as {
    things: Record<string, { lives: string; errors: Record<string, { code: string }>; machine: { notFrom: { error: string; code: string } } }>;
    operations: Record<string, { move: { key: string; from: ReadonlyArray<string>; emits: string }; budget?: { p95Ms: number } }>;
  };
  const allowance = m.things["allowance"]!;
  return {
    spend: m.operations["allowance.spend"]!, revoke: m.operations["allowance.revoke"]!,
    exceeded: { name: "AllowanceExceeded", code: allowance.errors["AllowanceExceeded"]!.code },
    notActive: { name: allowance.machine.notFrom.error, code: allowance.machine.notFrom.code },
    lives: allowance.lives,
  };
};

/** The five calls of this check, in a fresh acme world: ada founds and funds olga, olga spends, ada revokes, olga spends again. */
const story = async (seen: Seen) => {
  const people = await seen.cast("ada", "olga");
  const ada = people["ada"]!;
  const olga = people["olga"]!;
  const { body: { organization } } = await seen.call("organization/create", ada.token, { name: "Telemetry model", cap: "1000" });
  const { body: { allowance } } = await seen.call("allowance/grant", ada.token, { organization, member: olga.person, limit: "500" });
  const spend = (amount: string) => seen.call("allowance/spend", olga.token, { allowance, amount, memo: "check 17" });
  const first = await spend("120");
  const over = await spend("400");
  const last = await spend("380");
  const revoked = await seen.call("allowance/revoke", ada.token, { allowance });
  const after = await spend("1");
  return {
    first: { ...first, spans: await settled(seen, first.trace, "allowance.spend", true) },
    over: { ...over, spans: await settled(seen, over.trace, "allowance.spend", false) },
    last: { ...last, spans: await settled(seen, last.trace, "allowance.spend", true) },
    revoked: { ...revoked, spans: await settled(seen, revoked.trace, "allowance.revoke", true) },
    after: { ...after, spans: await settled(seen, after.trace, "allowance.spend", false) },
  };
};

describe("17 control: what telemetry carries today", () => {
  it("answers and refuses as the model says, with the operation span, its commit span, `refusal`, `move.name` and `move.to`", async () => {
    const root = acmeProject();
    const m = allowanceModel(root);
    await inWorld(root, async (seen) => {
      const calls = await story(seen);
      expect([calls.first.status, calls.over.status >= 400 && calls.over.status < 500, calls.over.body["_tag"], calls.last.status, calls.revoked.status, calls.after.body["_tag"]])
        .toEqual([200, true, m.exceeded.name, 200, 200, m.notActive.name]);
      expect(named(calls.first.spans, "allowance.spend")?.attrs).toMatchObject({ operation: "allowance.spend", attempt: 1, "move.name": m.spend.move.key, "move.to": "active" });
      expect(named(calls.first.spans, "allowance.spend.commit")?.attrs).toMatchObject({ "step.kind": "commit", "commit.outcome": "committed", "commit.entries": 1 });
      expect(named(calls.last.spans, "allowance.spend")?.attrs).toMatchObject({ "move.to": "exhausted" });
      expect(named(calls.over.spans, "allowance.spend")?.attrs).toMatchObject({ refusal: m.exceeded.name });
      expect(named(calls.after.spans, "allowance.spend")?.attrs).toMatchObject({ refusal: m.notActive.name });
      for (const refused of [calls.over, calls.after]) expect(named(refused.spans, "allowance.spend.commit"), "a refusal commits nothing").toBeUndefined();
    });
    nothingRunning(root);
  });

  it("counts every call and times it, in `ortho.calls` and `ortho.call.duration` (M1.20)", async () => {
    const root = acmeProject();
    await inWorld(root, async (seen) => {
      await story(seen);
      const mine = await until(async () => seen.metrics().filter((p) => p.labels["operation"] === "allowance.spend"), (all) => all.some((p) => p.name === "ortho.calls" && p.labels["outcome"] === "refused" && p.labels["refusal"] === "AllowanceNotActive" && p.value > 0));
      expect(mine.filter((p) => p.name === "ortho.calls" && p.value > 0).map((p) => p.labels["refusal"] ?? p.labels["outcome"]), "answered, and both refusals by name").toEqual(expect.arrayContaining(["AllowanceExceeded", "AllowanceNotActive"]));
      expect(mine.some((p) => p.name === "ortho.call.duration" && p.unit === "ms")).toBe(true);
    });
    nothingRunning(root);
  });
});

describe("17 M1.36: the move and the event, on the right spans", () => {
  it("writes `move.from` on the operation span: the state the subject was in, not the declared list", async () => {
    const root = acmeProject();
    const m = allowanceModel(root);
    expect(m.spend.move.from, "spend moves from active alone, in the model").toEqual(["active"]);
    expect(m.revoke.move.from, "revoke is declared from either, so a declared list could not be the answer").toEqual(["active", "exhausted"]);
    await inWorld(root, async (seen) => {
      const calls = await story(seen);
      expect(named(calls.first.spans, "allowance.spend")?.attrs["move.from"], "spend 120 from the active allowance").toBe(m.spend.move.from[0]);
      expect(named(calls.last.spans, "allowance.spend")?.attrs["move.from"], "the last 380 is spent from active too, to exhausted").toBe("active");
      expect(named(calls.revoked.spans, "allowance.revoke")?.attrs["move.from"], "revoke after the last spend leaves exhausted").toBe("exhausted");
      for (const refused of [calls.over, calls.after]) {
        expect(named(refused.spans, "allowance.spend")?.attrs["move.from"], "a refused call made no move").toBeUndefined();
      }
    });
    nothingRunning(root);
  });

  it("writes `event.name` on the commit span: the event the move emitted, per the model, and none on a refusal", async () => {
    const root = acmeProject();
    const m = allowanceModel(root);
    expect([m.spend.move.emits, m.revoke.move.emits]).toEqual(["AllowanceSpent", "AllowanceRevoked"]);
    await inWorld(root, async (seen) => {
      const calls = await story(seen);
      expect(named(calls.first.spans, "allowance.spend.commit")?.attrs["event.name"]).toBe(m.spend.move.emits);
      expect(named(calls.last.spans, "allowance.spend.commit")?.attrs["event.name"]).toBe(m.spend.move.emits);
      expect(named(calls.revoked.spans, "allowance.revoke.commit")?.attrs["event.name"]).toBe(m.revoke.move.emits);
      for (const refused of [calls.over, calls.after]) {
        expect(refused.spans.filter((span) => span.attrs["event.name"] !== undefined), "a refused call emitted no event, so none of its spans names one").toEqual([]);
      }
    });
    nothingRunning(root);
  });
});

describe("17 M1.36: the refusal's code", () => {
  it("writes `refusal.code` on the operation span: the declared error's, and the machine's, from the model; none on an answered call", async () => {
    const root = acmeProject();
    const m = allowanceModel(root);
    expect([m.exceeded.code, m.notActive.code], "the model's own codes").toEqual(["AL-001", "AL-900"]);
    await inWorld(root, async (seen) => {
      const calls = await story(seen);
      expect(named(calls.over.spans, "allowance.spend")?.attrs).toMatchObject({ refusal: m.exceeded.name, "refusal.code": m.exceeded.code });
      expect(named(calls.after.spans, "allowance.spend")?.attrs).toMatchObject({ refusal: m.notActive.name, "refusal.code": m.notActive.code });
      for (const answered of [calls.first, calls.last, calls.revoked]) {
        expect(answered.spans.filter((span) => span.attrs["refusal.code"] !== undefined), "an answered call has no refusal code").toEqual([]);
      }
    });
    nothingRunning(root);
  });
});

describe("17 M1.36: the environment and the store, on every call", () => {
  it("writes `environment` and `store` on the operation span of an answered call and of a refused one", async () => {
    const root = acmeProject();
    const m = allowanceModel(root);
    expect(m.lives, "acme's allowance lives in the default store, a database").toBe("database");
    await inWorld(root, async (seen) => {
      const calls = await story(seen);
      const operations = [[calls.first, "allowance.spend"], [calls.over, "allowance.spend"], [calls.revoked, "allowance.revoke"], [calls.after, "allowance.spend"]] as const;
      for (const [call, operation] of operations) {
        expect(named(call.spans, operation)?.attrs, `${operation} (${call.status})`).toMatchObject({ environment: "local", store: m.lives });
      }
    });
    nothingRunning(root);
  });
});

describe("17 M1.36: the budget's breaches", () => {
  it("counts one call held past the declared `budget.p95` in `ortho.budget.breaches`, and not the call inside it", async () => {
    const root = lampProject();
    const budget = (model(root) as unknown as { operations: Record<string, { budget?: { p95Ms: number } }> }).operations["lamp.glow"]?.budget;
    expect(budget, "the fixture declares a budget of 500 ms").toEqual({ p95Ms: 500 });
    const service = await gate();
    await inWorld(root, async (seen) => {
      service.close();
      const slow = seen.call("lamp/glow", undefined, { origin: service.origin });
      await until(async () => service.waiting(), (n) => n > 0, 60_000);
      expect(service.waiting(), "the handler is held in its wait step").toBe(1);
      await sleep(budget!.p95Ms * 2 + 200);
      service.open();
      const held = await slow;
      expect(held.status, JSON.stringify(held.body)).toBe(200);
      const quick = await seen.call("lamp/glow", undefined, { origin: service.origin });
      expect(quick.status, "with the gate open it answers at once").toBe(200);

      const ours = (all: ReadonlyArray<Point>) => all.filter((p) => p.labels["operation"] === "lamp.glow");
      const metrics = await until(async () => ours(seen.metrics()), (all) => all.some((p) => p.name === "ortho.calls" && p.value >= 2) || all.filter((p) => p.name === "ortho.calls").reduce((n, p) => n + p.value, 0) >= 2);
      // The controls, true today: two answered calls, the pair of them timed, and the slow one longer than its budget.
      const duration = metrics.filter((p) => p.name === "ortho.call.duration");
      expect(duration.reduce((n, p) => n + (p.count ?? 0), 0), "both calls were timed").toBeGreaterThanOrEqual(2);
      expect(Math.max(...duration.map((p) => p.value)), "the held call took longer than its budget").toBeGreaterThan(budget!.p95Ms);

      const breaches = await until(async () => ours(seen.metrics()).filter((p) => p.name === "ortho.budget.breaches"), (all) => all.length > 0, 15_000);
      expect(breaches.length, "`ortho.budget.breaches` is exported for lamp.glow").toBeGreaterThan(0);
      for (const point of breaches) expect(point.labels, "exactly the operation").toEqual({ operation: "lamp.glow" });
      // Delta or cumulative, the last export carries the total for the world's life: one breach, the held call.
      const total = Math.max(...breaches.map((p) => p.value));
      const summed = breaches.reduce((n, p) => n + p.value, 0);
      expect([total, summed].includes(1), `one breach (the held call), not two: ${JSON.stringify(breaches.map((p) => p.value))}`).toBe(true);
    });
    nothingRunning(root);
  });
});

describe("17 journeys: the fixture's operation is proved", () => {
  const journey = "a lamp glows";
  it("passes with its handler, and fails with empty handlers, naming its step", async () => {
    const root = lampProject();
    // A free port is named here: the run reports against it, and the port is not shared with another check.
    const real = run(root, "prove", "--only", journey, "--port", String(await freePort()));
    // `--only` leaves acme's other journeys unrun, so the run as a whole fails on their coverage: only this journey's line is judged.
    expect(real.out.match(/^journey .*$/gm), real.out).toEqual([`journey ${journey} ✔ 1/1 steps`]);
    nothingRunning(root);
    const source = textAt(root, "src/lamp/glow.ts");
    const empty = run(root, "prove", "--empty", "--only", journey, "--port", String(await freePort()));
    expect(empty.out.match(/^journey .*$/gm), empty.out).toEqual([`journey ${journey} ✘ 0/1 steps`]);
    expect(empty.out).toMatch(/✘ "anyone lights a lamp"/);
    expect(empty.status, empty.out).toBe(1);
    expect(textAt(root, "src/lamp/glow.ts"), "--empty leaves the handler untouched").toBe(source);
    nothingRunning(root);
  });
});
