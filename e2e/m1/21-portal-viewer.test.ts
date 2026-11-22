// Check 21 (M1.13): the portal as a viewer. The done-when, clause by clause:
//   A  "acme's docs unchanged and Plugged In's docs generated"
//   B  "the portal opens on Plugged In's things and the rail is scoped to the page"
//   C  "a journey's run lights up its operation and machine move"
//   D  "the 'no leak' check plants a raw statement, a `principal.person`, a non-public payload value and a log body in a staging
//       trace and none renders, while the caller's kind does"
//   E  "the portal's screenshots are byte-identical across two runs at the same `now`"
// What this file reads (K19, 19 November 2026): the portal as a person reads it. Plugged In's own generated `blueprint.json` is served the way
// its Worker serves it (the data API at `/_portal/v1/*` from `@orthograph/portal/server`, the prebuilt client at `/portal`), the live view
// read through a `TraceSource` fixture (an in-memory source; no cloud, no Docker, no Collector), and each route is opened in headless
// Chromium (`e2e/served-portal`, Playwright's own download). Every `data-portal` hook below is read off the rendered DOM, and the data API is
// read directly where a test is about data. It is never run against a real staging deployment.
//
// SCREENSHOTS come from the browser: a fixed viewport, no animation, the browser's own clock untouched (so a client that read the clock would
// show), two fresh served portals at the same `now` giving the same PNG bytes, and the HTML as well. Until the portal is split, every test that
// opens a page fails with a message that starts `K19:`; the controls that never open one pass.
//
// Surface this check REQUIRES, where `design/portal.md` (the agreed wireframe) fixes the content but not the markup. Decisions
// of the author, each recorded for the builder:
//  1. `PortalContext.live?: { environment; source: { window(since, now?) }; metrics: { window(since, now?) }; now; windowMs }`.
//     The rail's numbers come from `metrics`, the window's `ortho.calls` points (`{ name, labels: { operation, outcome, refusal? },
//     value }`), because a call refused at the door (role, payload) opens no span and only the metric counts it (portal.md, "An
//     operation's page"; the M1.13 row). Its last calls and everything else come from `source.window(windowMs, now)`. The portal
//     never reads a clock, and both `window`s fail if `now` is not passed. No `live`: no rail numbers.
//  2. Hooks are `data-portal="<part>"` attributes, with the data in `data-*` attributes, read here by a plain attribute scan:
//       top-bar        data-environment, data-window-ms
//       tree           (the tree) containing tree-item[data-kind="thing"][data-name]
//       thing-card     data-thing, data-calls, data-refused, data-defects (the home page, in the tree's order)
//       lifecycle      data-thing, data-states ("," joined, in the machine's order): on a card, and on a thing's page
//       rail           data-scope: "all" | "thing:<name>", containing stat[data-stat=calls|answered|refused|defects][data-value]
//                      and last-call[data-trace][data-operation][data-outcome][data-caller-kind]
//       operation-row  (a thing's page) data-operation, data-lit="true|false", data-calls, data-journeys ("," joined)
//       move           (a thing's page) data-move, data-lit, data-count: the arrows of the lifecycle
//       last-call      also data-attempts
//       span-row       (a trace's page) data-span-name, data-depth, data-attempt, data-logs (how many logs it has), data-outcome
//  3. A trace opens at `GET /portal/traces/<trace id>` (the drawer's content as a page). The waterfall shows structure, timing,
//     outcome, the declared refusal, how many logs a span has, and never a payload value, an answer value, a statement, a person
//     or a log body (portal.md, "The trace drawer").
//  4. The caller's kind is derived: a span with `principal.person` is "person"; `principal.kind` "agent" is "agent"; "anonymous"
//     is "anyone". It is never the person's id.
//  5. `calls` is the sum of `ortho.calls` in the window (one per call, however many attempts it took); `answered`, `refused` and
//     `defects` are its `outcome`s (`answered`, `refused`, `defect`), door refusals included. A last call is one row per trace
//     (`data-attempts` is how many `attempt`s its operation spans make), so a retry is one call and one row. A move counts once, when
//     the span of the attempt that committed has `move.name`. `data-lit` is true when the window holds at least one call of the
//     operation (or, for a move, one that took it). A trace's rows carry `data-attempt`, so the waterfall can group by attempt.
//  6. The pages G to L below (portal.md round 4, "The frame", "The calls table", the delta audit) are specified here, where the
//     design draws content and not markup. Routes: `/portal/environments/<name>` (one per declared environment),
//     `/portal/plugins` (plugins and stores, one page), `/portal/reference/<access|refusals|events|values|machines>`,
//     `/portal/operations/<op>?tab=<contract|metrics|proof|docs|notes>` (default contract; a server-rendered page per tab, the
//     calls table in `metrics`; there is no `spans` tab), `/portal/monitor*` (M1.49's, only listed). More hooks:
//       env-picker > env-option[data-environment][data-href][data-current]   env-page[data-environment][data-live]
//       env-summary[data-runs]   env-field[data-field][data-value]   proof-column[data-environment][data-focus]
//       plugin-card[data-plugin][data-kind][data-package][data-version]   store-row[data-store][data-kind]
//       store-binding[data-store][data-environment][data-runs-on]   rail-icon[data-panel]   panel-page[data-panel][data-title][data-href]
//       search-trigger[data-shortcut]   <script type="application/json" data-portal="search-index"> of
//       [{ kind: thing|operation|journey|refusal|environment|monitor, name, href, code? }]
//       op-tab[data-tab]   op-panel[data-tab]   tile[data-stat][data-value]   refusal-code[data-refusal][data-code][data-count]
//       calls-filter[data-filter][data-available]   calls-col[data-col]   call-row[data-trace][data-operation][data-outcome]
//       [data-refusal][data-caller-kind][data-attempts][data-duration-ms][data-over-budget][data-environment][data-start]
//       [data-request-key][data-role-held]   calls-footer[data-shown][data-total][data-door-refusals]
//       ref-row[data-name][data-code][data-count][data-span][data-trace]   not-yet[data-hole]   eval-verdicts[data-state]
//       proof-cell[data-environment][data-state]   journeys-empty
//     A call's duration is the extent of its attempt spans (portal.md, "Calls table vs spans"). A door refusal is a refusal
//     counted by `ortho.calls` that no span in the window accounts for; it is counted and never a row.
//  7. Every hole of portal.md's list that M1.13 cannot fill says "not yet" (an element `not-yet[data-hole]` and the value
//     `not yet` in the attribute), and no made-up value: request key (hole 1), role held (hole 8), per-eval verdicts (3).
//     The aggregate verdict per environment is not a hole; its states are `ProofState`'s (recorded-pass, failed, stale,
//     unproven, unavailable), and `unavailable` only where no logbook is configured, as here.
//  8. Journey steps come from `JourneyModel`, never from spans. Plugged In's wire now carries its journeys (N, with their steps), so
//     `/portal/journeys` draws `journey` N times and `journey-step` once for each declared step, with no `journeys-empty`, whatever the
//     window's traces hold; on a copy of the wire with `journeys` empty (`{}`) it shows the declared-none state (`journeys-empty`) and no
//     step. One page, `/portal/journeys`, lists every journey and its steps: the author's choice, not K19's text. The step-verdict hole (PRJ-47) is asserted once M1.42 brings step verdicts: not in this file yet.
//  9. The reference panel is pinned to portal.md's order: Access, Refusal codes, Events, Values, Machines (not sorted).
// 10. K19: every page, once drawn, carries `page[data-ready="true"][data-status]` (200, or 404 for a route that is not a page: the shell is always
//     a 200), which the harness waits for and reads a page's status from (`e2e/served-portal/README.md`).
//
// Red today on the missing surface: no `live` on the context, none of the hooks, no trace page, Plugged In's docs and generated
// files absent until M1.40, and `@orthograph/portal` not drawn with `@orthograph/portal-ui`. The controls pass today.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Wire, type BlueprintWire, type PortalContext } from "@orthograph/portal";
import { SourceFailed, type Span, type Trace } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import type { ServedPortal } from "../served-portal/types.ts";
import { acme, copyOf, digest, repo, succeeds } from "./support.ts";

// ---- the prerequisites, said plainly ----

const pluggedIn = join(repo, "examples/plugged-in");
const need = (what: string, ok: boolean, why: string) => { if (!ok) throw new Error(`M1.13 prerequisite missing: ${what}. ${why}`); };

const pluggedInWire = (): unknown => {
  const file = join(pluggedIn, "generated/portal/blueprint.json");
  need("examples/plugged-in/generated/portal/blueprint.json", existsSync(file), "Plugged In (M1.40, branch m1-40-plugged-in) is not on this branch, or was not generated; this check reads its portal data.");
  return JSON.parse(readFileSync(file, "utf8"));
};
const decode = (json: unknown): Promise<BlueprintWire> => Effect.runPromise(Wire.decode(json));

// ---- the instruments ----

/** Every `.ts` and `.tsx` file under a folder (none when it is not there). */
const sourceFiles = (dir: string): ReadonlyArray<string> => existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.name === "node_modules" || entry.name === "dist" ? [] : entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [])
  : [];

const NOW = 1_800_000_000_000;
const WINDOW = 30 * 60_000;
const at = (minutesAgo: number) => NOW - minutesAgo * 60_000;
const hex = (n: number) => createHash("sha256").update(`m1.13:${n}`).digest("hex");
const id = (n: number) => hex(n).slice(0, 32);
const sid = (n: number) => hex(n).slice(0, 16);

/** A `TraceSource` over fixed traces. Its `window` is honest (a trace is in when a span started within `since` of `now`) and it
 * FAILS when the portal does not pass `now`: a portal that reads the clock cannot be judged byte for byte. */
const source = (traces: ReadonlyMap<string, Trace>) => ({
  find: (trace: string) => Effect.succeed(traces.get(trace)),
  window: (since: number, now?: number) => now === undefined
    ? Effect.fail(new SourceFailed({ message: "the portal asked for a window without `now`: it reads a clock" }))
    : Effect.succeed(new Map([...traces].filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))),
});

/** The window's `ortho.calls`: one point per call in `traces` (a retry is one call), and the calls refused at the door, which have no span. */
const metricsOf = (fixture: Fixture) => {
  const calls: Array<{ readonly at: number; readonly operation: string; readonly outcome: string; readonly refusal?: string }> = [];
  for (const [, t] of fixture.traces) {
    const ops = t.spans.filter((s) => typeof s.attrs["operation"] === "string" && typeof s.attrs["attempt"] === "number");
    const last = ops.reduce((a, b) => (Number(b.attrs["attempt"]) > Number(a.attrs["attempt"]) ? b : a));
    const refusal = last.attrs["refusal"];
    calls.push({ at: last.start, operation: String(last.attrs["operation"]), outcome: typeof refusal === "string" ? "refused" : last.status === 2 ? "defect" : "answered", ...(typeof refusal === "string" ? { refusal } : {}) });
  }
  for (let i = 0; i < fixture.doorRefusals; i++) calls.push({ at: at(3) + i, operation: fixture.claim, outcome: "refused", refusal: "NotAllowed" });
  return {
    window: (since: number, now?: number) => now === undefined
      ? Effect.fail(new SourceFailed({ message: "the portal asked for metrics without `now`: it reads a clock" }))
      : Effect.succeed(Object.values(calls.filter((c) => c.at >= now - since && c.at <= now).reduce<Record<string, { name: string; labels: Record<string, string>; value: number }>>((all, c) => {
        const labels: Record<string, string> = { operation: c.operation, outcome: c.outcome, ...(c.refusal === undefined ? {} : { refusal: c.refusal }) };
        const key = JSON.stringify(labels);
        all[key] = { name: "ortho.calls", labels, value: (all[key]?.value ?? 0) + 1 };
        return all;
      }, {}))),
  };
};

const span = (n: number, trace: number, name: string, start: number, attrs: Record<string, unknown> = {}, over: Partial<Span> = {}): Span =>
  ({ traceId: id(trace), spanId: sid(n), parentSpanId: "", name, attrs, status: 1, ms: 9, start, ...over });

/** Values planted into the staging trace: each unique, each found nowhere in the blueprint. */
const PLANTED = {
  statement: "SELECT-STATEMENT-7f31 name FROM handles WHERE name = 'ada-7f31'",
  person: "per_PERSON-7f31",
  payload: "PAYLOAD-NONPUBLIC-7f31",
  log: "LOG-BODY-7f31",
} as const;
const planted = Object.values(PLANTED);

interface Fixture {
  readonly traces: Map<string, Trace>;
  readonly claim: string; readonly add: string; readonly move: string;
  readonly doorRefusals: number;
  readonly ids: { readonly answered: string; readonly refused: string; readonly added: string; readonly defect: string; readonly old: string };
}

/** The staging window over Plugged In's own names: a journey's claim answered, a claim refused, a link added, a link defect, and
 * a claim from before the window. The caller kinds: person, agent, anyone, anyone, person. */
const stage = (wire: BlueprintWire): Fixture => {
  const claim = wire.model.operations["handle.claim"];
  const add = wire.model.operations["link.add"];
  need("handle.claim in Plugged In's model", claim !== undefined && claim.move !== null, "M1.40 declares `handle.claim` with a move (design/decisions/M1-plugged-in.md).");
  need("link.add in Plugged In's model", add !== undefined && add.move !== null, "M1.40 declares `link.add` with a move.");
  const move = claim!.move!.key;
  const refusal = claim!.errors[0] ?? "HandleTaken";
  const traces = new Map<string, Trace>();
  // 1. answered on its second attempt (the first lost the commit), called by a person, as a journey's step (the root is the
  //    journey's, written as `journey-root.ts` writes it), carrying every planted value
  const a = id(1);
  const person = { "principal.person": PLANTED.person };
  traces.set(a, {
    spans: [
      span(10, 1, "journey.claim a name", at(5), { journey: "claim a name", "journey.step": "claim the name", operation: "handle.claim", "http.status_code": 200 }),
      span(14, 1, "handle.claim", at(5) + 1, { operation: "handle.claim", attempt: 1, ...person }, { parentSpanId: sid(10) }),
      span(15, 1, "handle.claim.commit", at(5) + 2, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: sid(14), ms: 3 }),
      span(11, 1, "handle.claim", at(5) + 3, { operation: "handle.claim", attempt: 2, ...person, "payload.token": PLANTED.payload, "answer.token": PLANTED.payload, "move.name": move, "move.to": "claimed", environment: "staging" }, { parentSpanId: sid(10) }),
      span(12, 1, "handle.claim.lookup", at(5) + 4, { "step.kind": "database", "db.statement": PLANTED.statement, "db.query.text": PLANTED.statement }, { parentSpanId: sid(11), ms: 2 }),
      span(13, 1, "handle.claim.commit", at(5) + 5, { "step.kind": "commit", "commit.outcome": "committed", "event.name": "HandleClaimed" }, { parentSpanId: sid(11), ms: 3 }),
    ],
    logs: [{ traceId: a, spanId: sid(11), body: PLANTED.log, attrs: { "log.note": PLANTED.log } }],
  });
  // 2. refused, called by an agent
  const b = id(2);
  traces.set(b, { spans: [span(20, 2, "handle.claim", at(4), { operation: "handle.claim", attempt: 1, "principal.kind": "agent", refusal, "refusal.code": "HN-001" })], logs: [] });
  // 3. a link added, answered, called by anyone
  const c = id(3);
  traces.set(c, { spans: [span(30, 3, "link.add", at(3), { operation: "link.add", attempt: 1, "principal.kind": "anonymous", "move.name": add!.move!.key, "move.to": "listed" })], logs: [] });
  // 4. a defect on link.add
  const d = id(4);
  traces.set(d, { spans: [span(40, 4, "link.add", at(2), { operation: "link.add", attempt: 1, "principal.kind": "anonymous" }, { status: 2, ms: 300 })], logs: [] });
  // 5. a claim from before the window
  const o = id(5);
  traces.set(o, { spans: [span(50, 5, "handle.claim", at(90), { operation: "handle.claim", attempt: 1, "principal.person": PLANTED.person, "move.name": move })], logs: [] });
  return { traces, claim: "handle.claim", add: "link.add", move, doorRefusals: 3, ids: { answered: a, refused: b, added: c, defect: d, old: o } };
};

const context = (blueprint: BlueprintWire, run: Pick<Fixture, "traces" | "doorRefusals" | "claim">, now = NOW, environment = "staging") =>
  ({ blueprint, reader: null, bundleRevision: null, live: { environment, source: source(run.traces), metrics: metricsOf(run as Fixture), now, windowMs: WINDOW } }) as unknown as PortalContext;
const dark = { traces: new Map<string, Trace>(), doorRefusals: 0, claim: "handle.claim" };

// K19: the portal is read the way a person reads it. Each context is served (the data API at `/_portal/v1/*` from `@orthograph/portal/server`,
// the prebuilt client at `/portal`) and a route is opened in headless Chromium; `text` is the rendered DOM, so every `data-portal` hook
// below is read off the page a person sees. A path under `/_portal/` goes straight to the data API. Until the portal is split, `get`
// throws a message that names K19 (`served-portal/service.ts`).
const served = new Map<PortalContext, Promise<ServedPortal>>();
const portalOf = (ctx: PortalContext): Promise<ServedPortal> => {
  const open = served.get(ctx) ?? ServedPortals.open({ context: ctx });
  served.set(ctx, open);
  return open;
};
afterAll(async () => { await ServedPortals.closeAll(); });

const get = async (ctx: PortalContext, path: string) => {
  const portal = await portalOf(ctx);
  if (path.startsWith("/_portal/")) { const answer = await portal.data(path); return { status: answer.status, text: answer.text, fetched: [] as ReadonlyArray<{ text: string }> }; }
  const page = await portal.page(path);
  return { status: page.status, text: page.html, fetched: page.fetched };
};
/** The pixels of a route, from the same served portal. */
const shoot = async (ctx: PortalContext, path: string) => (await portalOf(ctx)).shoot(path);

type Attrs = Record<string, string>;
const unescape = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** Every element carrying `data-portal="<part>"`, with its attributes. */
const parts = (html: string, part: string): Array<Attrs> =>
  [...html.matchAll(new RegExp(`<[a-z][a-z0-9]*\\b[^>]*\\bdata-portal="${part}"[^>]*>`, "g"))].map(([tag]) =>
    Object.fromEntries([...tag!.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, unescape(v!)])));
/** The part's elements inside the first `rail`. */
const railOf = (html: string) => {
  const start = html.search(/data-portal="rail"/);
  return start < 0 ? "" : html.slice(start);
};
const stat = (html: string, name: string) => parts(railOf(html), "stat").find((s) => s["data-stat"] === name)?.["data-value"];
const scopeOf = (html: string) => parts(html, "rail")[0]?.["data-scope"];

/** Which planted values a text carries. */
const leaked = (text: string) => planted.filter((v) => text.includes(v) || unescape(text).includes(v));

// ---- A: docs ----

describe("21 control: acme's docs are the baseline, and the instruments are sound", () => {
  it("acme's checked-in docs are the recorded bytes, and `ortho generate` in a copy writes the same", () => {
    const baseline = JSON.parse(readFileSync(join(repo, "e2e/fixtures/m1/portal/acme-docs-baseline.json"), "utf8")) as Record<string, string>;
    expect(Object.keys(baseline).length, "the baseline holds the docs").toBeGreaterThan(10);
    const copy = copyOf(acme);
    try {
      expect(digest(copy.root, "generated/docs"), "the copy as checked in").toEqual(baseline);
      succeeds(copy.root, "generate");
      expect(digest(copy.root, "generated/docs"), "after `ortho generate`").toEqual(baseline);
    } finally { copy.remove(); }
  });

  it("the fixture source is honest: it filters by the window, refuses a missing `now`, and holds every planted value", async () => {
    const stub = stage(fakeWire);
    const src = source(stub.traces);
    const inWindow = await Effect.runPromise(src.window(WINDOW, NOW));
    expect([...inWindow.keys()].sort()).toEqual([stub.ids.answered, stub.ids.refused, stub.ids.added, stub.ids.defect].sort());
    expect(Effect.runSync(Effect.exit(src.window(WINDOW)))._tag, "no `now`, no answer").toBe("Failure");
    const metrics = metricsOf(stub);
    expect(Effect.runSync(Effect.exit(metrics.window(WINDOW)))._tag, "metrics too").toBe("Failure");
    const points = await Effect.runPromise(metrics.window(WINDOW, NOW));
    expect(points.reduce((n, p) => n + p.value, 0), "one point per call (the retry is one), the door refusals, and not the old call").toBe(7);
    expect(points.find((p) => p.labels["refusal"] === "NotAllowed")?.value, "door refusals have metrics and no span").toBe(3);
    const bytes = JSON.stringify([...inWindow.values()]);
    expect(leaked(bytes).sort(), "all four planted values are in the staging trace").toEqual([...planted].sort());
  });

  it("the leak scanner sees a value in a page, and a clean page is clean", () => {
    expect(leaked(`<td>${PLANTED.statement}</td>`)).toEqual([PLANTED.statement]);
    expect(leaked("<td>SELECT</td>")).toEqual([]);
  });
});

/** Just the names `stage` reads, for the instrument controls, which judge the source and the scanner and not the portal. */
const fakeWire = { model: { operations: { "handle.claim": { move: { key: "claim" }, errors: ["HandleTaken"] }, "link.add": { move: { key: "add" }, errors: [] } } } } as unknown as BlueprintWire;

describe("21 control: the served portal", () => {
  // K19: a person opens `/portal` and the page draws itself from `/_portal/v1/*`. Today there is no server half and no built client.
  it("serves acme's `/portal` and a thing's page to a browser, twice with the same bytes", async () => {
    const wire = await decode(JSON.parse(readFileSync(join(repo, "examples/acme/generated/portal/blueprint.json"), "utf8")));
    const first = await get(context(wire, dark), "/portal");
    const again = await get(context(wire, dark), "/portal");
    expect(first.status).toBe(200);
    expect(first.text).toContain("<html");
    expect(first.text).toBe(again.text);
    const thing = Object.keys(wire.model.things)[0]!;
    expect((await get(context(wire, dark), `/portal/things/${thing}`)).status).toBe(200);
  });

  it("`@orthograph/portal-ui` exports the names the pages are drawn with", () => {
    const index = readFileSync(join(repo, "packages/portal-ui/src/index.ts"), "utf8");
    for (const name of ["Shell", "Stat", "StatGroup", "Timeline", "Grid", "Card", "Chart", "Widget"]) expect(index, `portal-ui exports ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  });
});

describe("21 A: docs", () => {
  it("Plugged In's docs are generated: an index and a page for each thing, handle, profile and link", () => {
    pluggedInWire();
    const docs = join(pluggedIn, "generated/docs");
    need("examples/plugged-in/generated/docs", existsSync(docs), "run `ortho generate` in examples/plugged-in; the docs projection is mounted as acme mounts it.");
    for (const thing of ["handle", "profile", "link"]) expect(existsSync(join(docs, thing, "index.md")), `docs/${thing}/index.md`).toBe(true);
    expect(readFileSync(join(docs, "handle/index.md"), "utf8")).toMatch(/claim/i);
  });
});

// ---- B: opens on the things, the rail scoped to the page ----

describe("21 B: the portal opens on Plugged In's things", () => {
  it("`/portal` is the things as cards in the tree's order, each with its lifecycle, under the environment's top bar", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const home = await get(ctx, "/portal");
    expect(home.status).toBe(200);
    const names = Object.keys(wire.model.things);
    expect(names.sort(), "Plugged In's own things, as the model has them").toEqual(["handle", "link", "profile"]);
    const cards = parts(home.text, "thing-card").map((c) => c["data-thing"]);
    expect(cards, "one card per thing, nothing else, none twice").toEqual(expect.arrayContaining(names));
    expect(cards.length).toBe(names.length);
    const tree = parts(home.text, "tree-item").filter((i) => i["data-kind"] === "thing").map((i) => i["data-name"]);
    expect(tree, "the tree lists the same things in the same order as the cards").toEqual(cards);
    expect(parts(home.text, "top-bar")[0]).toMatchObject({ "data-environment": "staging", "data-window-ms": String(WINDOW) });
    for (const [name, thing] of Object.entries(wire.model.things)) {
      const strip = parts(home.text, "lifecycle").find((l) => l["data-thing"] === name);
      if (thing.machine === null) expect(strip, `${name} has no machine: no lifecycle strip`).toBeUndefined();
      else expect(strip?.["data-states"], `${name}'s lifecycle strip`).toBe(thing.machine.states.join(","));
    }
  });

  it("the rail is scoped to the page: everything on home, the thing's operations on its page, nothing from outside the window", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const rails = async (path: string) => { const { text } = await get(ctx, path); return { scope: scopeOf(text), calls: stat(text, "calls"), answered: stat(text, "answered"), refused: stat(text, "refused"), defects: stat(text, "defects") }; };
    // From `ortho.calls`: the retried claim is one call, three more claims were refused at the door (no span), the claim from 90 minutes ago is out.
    expect(await rails("/portal"), "home").toEqual({ scope: "all", calls: "7", answered: "2", refused: "4", defects: "1" });
    expect(await rails("/portal/things/handle")).toEqual({ scope: "thing:handle", calls: "5", answered: "1", refused: "4", defects: "0" });
    expect(await rails("/portal/things/link")).toEqual({ scope: "thing:link", calls: "2", answered: "1", refused: "0", defects: "1" });
    expect((await rails("/portal/things/profile")).calls, "profile saw no call").toBe("0");
    const handle = (await get(ctx, "/portal/things/handle")).text;
    const last = parts(handle, "last-call");
    expect(last.map((l) => l["data-trace"]).sort(), "the rail's last calls are this thing's, from the window").toEqual([stage(wire).ids.answered, stage(wire).ids.refused].sort());
    expect(last.find((l) => l["data-trace"] === stage(wire).ids.answered)?.["data-attempts"], "the retried claim is one row, of two attempts").toBe("2");
  });
});

// ---- C: a journey's run lights up ----

describe("21 C: a journey's run lights up its operation and its machine move", () => {
  it("handle's page lights `claim` and its arrow, names the journey, and leaves the unrun operations and arrows dark", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { text } = await get(context(wire, run), "/portal/things/handle");
    const rows = parts(text, "operation-row");
    expect(rows.map((r) => r["data-operation"]).sort(), "every operation of the thing has a row").toEqual(Object.keys(wire.model.operations).filter((o) => wire.model.operations[o]!.thing === "handle").sort());
    const claim = rows.find((r) => r["data-operation"] === run.claim);
    expect(claim, "the claim's row").toMatchObject({ "data-lit": "true", "data-calls": "5" });
    expect(claim?.["data-journeys"]?.split(","), "the journey whose run did it").toContain("claim a name");
    for (const row of rows.filter((r) => r["data-operation"] !== run.claim)) expect(row["data-lit"], `${row["data-operation"]} saw no call`).toBe("false");
    const moves = parts(text, "move");
    expect(moves.find((m) => m["data-move"] === run.move), "the arrow the answered claim took").toMatchObject({ "data-lit": "true", "data-count": "1" });
    for (const m of moves.filter((m) => m["data-move"] !== run.move)) expect(m["data-lit"]).toBe("false");
  });

  it("link's page lights `add` (answered once, a defect once) and its arrow, and leaves `order` and `remove` dark", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { text } = await get(context(wire, run), "/portal/things/link");
    const own = Object.keys(wire.model.operations).filter((o) => wire.model.operations[o]!.thing === "link").sort();
    expect(own, "Plugged In's link has add, order and remove").toEqual(["link.add", "link.order", "link.remove"]);
    const rows = parts(text, "operation-row");
    expect(rows.map((r) => r["data-operation"]).sort()).toEqual(own);
    expect(rows.find((r) => r["data-operation"] === "link.add"), "add's row").toMatchObject({ "data-lit": "true", "data-calls": "2" });
    expect(rows.find((r) => r["data-operation"] === "link.add")?.["data-journeys"], "no journey ran it").toBe("");
    for (const name of ["link.order", "link.remove"]) expect(rows.find((r) => r["data-operation"] === name)?.["data-lit"], `${name} saw no call`).toBe("false");
    const addMove = wire.model.operations["link.add"]!.move!.key;
    const moves = parts(text, "move");
    expect(moves.find((m) => m["data-move"] === addMove), "the arrow the answered add took, not the defect").toMatchObject({ "data-lit": "true", "data-count": "1" });
    const removeMove = wire.model.operations["link.remove"]!.move?.key;
    expect(moves.find((m) => m["data-move"] === removeMove), "remove's arrow").toMatchObject({ "data-lit": "false" });
  });

  it("with no run in the window the same page is all dark", async () => {
    const wire = await decode(pluggedInWire());
    const { text } = await get(context(wire, dark), "/portal/things/handle");
    const lit = [...parts(text, "operation-row"), ...parts(text, "move")].filter((p) => p["data-lit"] !== "false");
    expect(parts(text, "operation-row").length, "the rows exist").toBeGreaterThan(0);
    expect(lit).toEqual([]);
  });
});

// ---- D: no leak ----

const routes = (wire: BlueprintWire, run: Fixture) => [
  "/portal",
  ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`),
  ...Object.keys(wire.model.operations).map((o) => `/portal/operations/${o}`),
  ...Object.values(run.ids).map((t) => `/portal/traces/${t}`),
  "/_portal/v1/blueprint",
];

describe("21 D: no leak", () => {
  it("a raw statement, a `principal.person`, a non-public payload value and a log body in a staging trace render nowhere, and the caller's kind does", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const ctx = context(wire, run);
    expect(leaked(JSON.stringify([...run.traces.values()])).length, "the instrument: the trace holds all four").toBe(4);
    const found: Record<string, Array<string>> = {};
    for (const path of routes(wire, run)) {
      const { status, text, fetched } = await get(ctx, path);
      expect([200, 404], `${path} answers`).toContain(status);
      // The page, and every data response the browser read to draw it: the leak surface is the data API now.
      const seen = leaked([text, ...fetched.map((f) => f.text)].join(" "));
      if (seen.length > 0) found[path] = seen;
    }
    expect(found, "pages that carried a hidden value").toEqual({});
    const handle = (await get(ctx, "/portal/things/handle")).text;
    const kinds = Object.fromEntries(parts(handle, "last-call").map((l) => [l["data-trace"], l["data-caller-kind"]]));
    expect(kinds, "the caller's kind, derived: a person's span carries `principal.person` and not `principal.kind`").toEqual({ [run.ids.answered]: "person", [run.ids.refused]: "agent" });
    const link = (await get(ctx, "/portal/things/link")).text;
    expect(parts(link, "last-call").map((l) => l["data-caller-kind"]), "an anonymous caller is anyone").toEqual(["anyone", "anyone"]);
  });

  it("the trace page shows the answered call's structure and timing, and how many logs its span has, with none of the four", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { status, text } = await get(context(wire, run), `/portal/traces/${run.ids.answered}`);
    expect(status).toBe(200);
    const rows = parts(text, "span-row");
    expect(rows.map((r) => `${r["data-span-name"]}#${r["data-attempt"] ?? ""}`), "the waterfall, in start order, grouped by attempt").toEqual(["journey.claim a name#", "handle.claim#1", "handle.claim.commit#1", "handle.claim#2", "handle.claim.lookup#2", "handle.claim.commit#2"]);
    expect(rows.find((r) => r["data-span-name"] === "handle.claim" && r["data-attempt"] === "2")?.["data-logs"], "one log on the second attempt, counted and never read").toBe("1");
    expect(leaked(text)).toEqual([]);
  });
});

// ---- E: byte-identical screenshots ----

describe("21 E: the portal's pages are byte-identical across two runs at the same `now`", () => {
  const shots = async (now: number) => {
    const wire = await decode(pluggedInWire());          // a fresh decode and a fresh source each run
    const run = stage(wire);
    const ctx = context(wire, run, now);
    const out: Record<string, string> = {};
    for (const path of ["/portal", ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`), `/portal/traces/${run.ids.answered}`]) out[path] = (await get(ctx, path)).text;
    return out;
  };

  it("two runs give the same bytes for the home page, every thing's page and a trace", async () => {
    const one = await shots(NOW);
    const two = await shots(NOW);
    expect(Object.keys(one).length).toBeGreaterThanOrEqual(5);
    expect(parts(one["/portal"]!, "thing-card").length, "not empty pages that are trivially equal").toBeGreaterThan(0);
    for (const path of Object.keys(one)) expect(two[path], path).toBe(one[path]);
  });

  it("two runs give the same pixels: the screenshots of the home page, a thing's page and a trace are byte-identical, and a later `now` is not", async () => {
    const pictures = async (now: number) => {
      const wire = await decode(pluggedInWire());
      const run = stage(wire);
      const ctx = context(wire, run, now);
      return Object.fromEntries(await Promise.all(["/portal", "/portal/things/handle", `/portal/traces/${run.ids.answered}`].map(async (path) => [path, Buffer.from(await shoot(ctx, path)).toString("base64")] as const)));
    };
    const one = await pictures(NOW);
    const two = await pictures(NOW);
    for (const path of Object.keys(one)) { expect(one[path]!.length, `${path} is a picture`).toBeGreaterThan(1000); expect(two[path], `${path}, the same bytes`).toBe(one[path]); }
    expect((await pictures(NOW + 26 * 60_000))["/portal"], "the picture follows `now`: the window moved").not.toBe(one["/portal"]);
  });

  it("`now` is the only clock: a later `now` that moves the window changes the rail, and no page holds the real time", async () => {
    const one = await shots(NOW);
    const later = await shots(NOW + 26 * 60_000);
    expect(later["/portal"], "the retried claim, five minutes old, is now 31: out of a 30-minute window").not.toBe(one["/portal"]);
    expect(stat(later["/portal"]!, "calls"), "six calls where there were seven").toBe("6");
    const year = String(new Date().getFullYear());
    expect(Object.values(one).filter((text) => text.includes("2001-09-09")), "the browser's clock is fixed at 2001-09-09: no page may draw it").toEqual([]);
    const stamps = Object.values(one).flatMap((text) => text.match(new RegExp(`${year}-\\d\\d-\\d\\dT\\d\\d:\\d\\d`, "g")) ?? []);
    expect(stamps.filter((s) => !s.startsWith(new Date(NOW).toISOString().slice(0, 10))), "no timestamp from the clock").toEqual([]);
  });
});

// ---- the seam: pages are drawn with portal-ui ----

describe("21 F: the portal's pages are drawn from `@orthograph/portal-ui`", () => {
  // K19: the client is built once, here, from portal-ui; what ships is the built files. So portal-ui is the client's build input (a
  // devDependency), a client source file imports it, and the manifest's `dependencies`, which every project installs, hold none of the three.
  it("`@orthograph/portal`'s client imports portal-ui, as a build input, and its shipped dependencies hold no React, no portal-ui and no HeroUI", () => {
    const manifest = JSON.parse(readFileSync(join(repo, "packages/portal/package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(Object.keys(manifest.devDependencies ?? {}), "K19: portal-ui is the client's build input").toContain("@orthograph/portal-ui");
    const shipped = Object.keys(manifest.dependencies ?? {}).filter((name) => name === "react" || name === "react-dom" || name === "@orthograph/portal-ui" || name.startsWith("@heroui"));
    expect(shipped, "K19: nothing a project installs carries the UI").toEqual([]);
    const importers = sourceFiles(join(repo, "packages/portal/src")).filter((file) => /from\s+["']@orthograph\/portal-ui["']/.test(readFileSync(file, "utf8")));
    expect(importers.length, "K19: the client's source imports @orthograph/portal-ui").toBeGreaterThan(0);
  });
});

// ---- round 4: the pages that were held (portal.md, "Round 4", "The frame", "The calls table", the delta audit) ----

type Model = BlueprintWire["model"] & { readonly environments?: Record<string, { runs: string; promotesFrom: string | null; lifetimeMs: number | null; cloud?: { database: string } | null; database?: string | null }>; readonly mounts?: Record<string, { kind: string; package: string; version: string }>; readonly refusals?: Record<string, string>; readonly journeys?: Record<string, unknown> };
const rawOf = (): Model => (pluggedInWire() as { model: Model }).model;
/** The environments the blueprint declares, sorted: the one list every environment assertion below compares against. It must hold at least `local` and `test`, so it cannot pass on an empty set. */
const declaredEnvironments = (): string[] => {
  const names = Object.keys(rawOf().environments ?? {}).sort();
  expect(names, "Plugged In declares at least local and test").toEqual(expect.arrayContaining(["local", "test"]));
  return names;
};

/** The `test` environment's own window: its own sink holds one call (each environment's portal reads only its own sink). */
const stageOther = (): Pick<Fixture, "traces" | "doorRefusals" | "claim"> => ({
  traces: new Map([[id(60), { spans: [span(60, 60, "link.add", at(1), { operation: "link.add", attempt: 1, "principal.kind": "anonymous", "move.name": "add" })], logs: [] }]]),
  doorRefusals: 0, claim: "link.add",
});

const json = (html: string, part: string): unknown => {
  const found = html.match(new RegExp(`<script[^>]*data-portal="${part}"[^>]*>([\\s\\S]*?)</script>`));
  if (found === null) return undefined;
  try { return JSON.parse(unescape(found[1]!)); } catch { return undefined; }
};
const withoutFragment = (href: string) => href.split("#")[0]!;

describe("21 G: one page per declared environment, and the environment is part of every page", () => {
  it("each declared environment has a page with its summary, its declared fields and a proof column for every environment, this one in focus", async () => {
    const wire = await decode(pluggedInWire());
    const declared = declaredEnvironments();
    const ctx = context(wire, stage(wire));
    for (const name of declared) {
      const { status, text } = await get(ctx, `/portal/environments/${name}`);
      expect(status, `/portal/environments/${name}`).toBe(200);
      expect(parts(text, "env-page")[0], "the page names its environment").toMatchObject({ "data-environment": name });
      const env = rawOf().environments![name]!;
      expect(parts(text, "env-summary")[0]?.["data-runs"], "the summary card's `runs`").toBe(env.runs);
      const fields = Object.fromEntries(parts(text, "env-field").map((f) => [f["data-field"], f["data-value"]]));
      expect(fields["runs"]).toBe(env.runs);
      expect(Object.keys(fields), "the fields the wire carries today").toEqual(expect.arrayContaining(["runs", "promotesFrom", "lifetimeMs"]));
      const columns = parts(text, "proof-column");
      expect(columns.map((c) => c["data-environment"]).sort(), "every environment's column").toEqual(declared);
      expect(columns.filter((c) => c["data-focus"] === "true").map((c) => c["data-environment"]), "this page's one in focus").toEqual([name]);
    }
    expect((await get(ctx, "/portal/environments/nowhere")).status, "an undeclared environment is not a page").toBe(404);
  });

  it("the picker lists the declared environments and marks the current one; each page is the environment's own portal", async () => {
    const wire = await decode(pluggedInWire());
    const local = context(wire, stage(wire), NOW, "local");
    const test = context(wire, stageOther(), NOW, "test");
    const homeLocal = (await get(local, "/portal")).text;
    const options = parts(homeLocal, "env-option");
    expect(options.map((o) => o["data-environment"]).sort(), "the picker").toEqual(declaredEnvironments());
    expect(options.find((o) => o["data-environment"] === "local")?.["data-current"], "local is where this portal runs").toBe("true");
    expect(options.find((o) => o["data-environment"] === "test")).toMatchObject({ "data-current": "false", "data-href": "/portal/environments/test" });
    const homeTest = (await get(test, "/portal")).text;
    expect(parts(homeLocal, "top-bar")[0]).toMatchObject({ "data-environment": "local" });
    expect(parts(homeTest, "top-bar")[0]).toMatchObject({ "data-environment": "test" });
    expect([stat(homeLocal, "calls"), stat(homeTest, "calls")], "each environment's rail reads its own sink").toEqual(["7", "1"]);
    expect(parts((await get(local, "/portal/environments/local")).text, "env-page")[0]?.["data-live"], "the environment you are in is live").toBe("true");
    const other = await get(local, "/portal/environments/test");
    expect(parts(other.text, "env-page")[0]?.["data-live"], "another environment is read in its own portal").toBe("false");
    expect(other.text, "and says whose portal reads it").toMatch(/own portal/i);
  });

  it("every kind of page carries the environment in its top bar", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire), NOW, "local");
    for (const path of ["/portal", "/portal/things/handle", "/portal/operations/handle.claim", "/portal/operations/handle.claim?tab=metrics", "/portal/environments/test", "/portal/plugins", "/portal/journeys", "/portal/reference/refusals", `/portal/traces/${stage(wire).ids.answered}`]) {
      const { status, text } = await get(ctx, path);
      expect(status, path).toBe(200);
      expect(parts(text, "top-bar")[0], path).toMatchObject({ "data-environment": "local", "data-window-ms": String(WINDOW) });
    }
  });
});

describe("21 H: plugins and stores, one page", () => {
  it("a card per mount with its kind and package, then the stores table with what each store runs on in each environment", async () => {
    const wire = await decode(pluggedInWire());
    const { status, text } = await get(context(wire, stage(wire)), "/portal/plugins");
    expect(status).toBe(200);
    const mounts = rawOf().mounts!;
    const cards = parts(text, "plugin-card");
    expect(cards.map((c) => c["data-plugin"]).sort(), "Plugged In mounts three projections").toEqual(Object.keys(mounts).sort());
    for (const card of cards) expect(card, card["data-plugin"]).toMatchObject({ "data-kind": mounts[card["data-plugin"]!]!.kind, "data-package": mounts[card["data-plugin"]!]!.package, "data-version": mounts[card["data-plugin"]!]!.version });
    // Plugged In declares no store: the drawing's convention is one `default` row, bound per environment to the database it runs on.
    expect(rawOf()).not.toHaveProperty("stores");
    expect(parts(text, "store-row").map((r) => r["data-store"]), "one default store").toEqual(["default"]);
    const environments = rawOf().environments!;
    const bindings = Object.fromEntries(parts(text, "store-binding").map((b) => [b["data-environment"], b["data-runs-on"]]));
    expect(bindings).toEqual(Object.fromEntries(Object.entries(environments).map(([name, e]) => [name, e.database ?? e.cloud?.database])));
    expect(parts(text, "store-row")[0]!["data-kind"], "its kind").toBe("database");
    expect(text, "never a count of rows (portal.md Q4)").not.toMatch(/data-rows=/);
  });
});

describe("21 I: the icon rail and the command palette", () => {
  it("five icons, in order, on every page, each opening a short panel of pages", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    for (const path of ["/portal", "/portal/operations/link.add", "/portal/plugins"]) {
      const { text } = await get(ctx, path);
      expect(parts(text, "rail-icon").map((i) => i["data-panel"]), `${path}: the icon rail`).toEqual(["things", "proof", "reference", "plugins", "monitor"]);
    }
    const { text } = await get(ctx, "/portal");
    const panel = (name: string) => parts(text, "panel-page").filter((p) => p["data-panel"] === name);
    expect(panel("things").map((p) => p["data-title"]).sort(), "things: the things tree").toEqual(["handle", "link", "profile"]);
    expect(panel("proof").map((p) => p["data-title"]), "proof: each environment, compare, journeys, starting worlds").toEqual(expect.arrayContaining(["local", "test", "Compare environments", "Journeys", "Starting worlds"]));
    expect(panel("reference").map((p) => p["data-title"]), "reference: five pages, and no list of every code").toEqual(["Access", "Refusal codes", "Events", "Values", "Machines"]);
    expect(panel("plugins").map((p) => p["data-title"])).toEqual(["Plugins and stores"]);
    expect(panel("monitor").length, "monitor lists one or two pages").toBeGreaterThanOrEqual(1);
    expect(panel("monitor").length).toBeLessThanOrEqual(2);
    // Listed only where another slice builds the page: values (M1.42's wire), compare and starting worlds, monitor (M1.49).
    const fetched = [...panel("things"), ...panel("proof").filter((p) => /\/environments\/[a-z]+$/.test(p["data-href"]!) || p["data-title"] === "Journeys"), ...panel("reference").filter((p) => p["data-title"] !== "Values"), ...panel("plugins")];
    expect(fetched.length).toBeGreaterThan(0);
    for (const p of fetched) expect((await get(ctx, p["data-href"]!)).status, `${p["data-panel"]} > ${p["data-title"]} at ${p["data-href"]}`).toBe(200);
  });

  it("⌘K searches things, operations, journeys, refusal codes, environments and monitor pages, from one index in the page", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const ctx = context(wire, run);
    const { text } = await get(ctx, "/portal");
    expect(parts(text, "search-trigger")[0], "the top bar's widest control").toMatchObject({ "data-shortcut": "⌘K" });
    const index = json(text, "search-index") as Array<{ kind: string; name: string; href: string; code?: string }> | undefined;
    expect(Array.isArray(index), "the index is data in the page").toBe(true);
    const of = (kind: string) => (index ?? []).filter((e) => e.kind === kind);
    const raw = rawOf();
    expect(of("thing").map((e) => e.name).sort()).toEqual(["handle", "link", "profile"]);
    expect(of("operation").map((e) => e.name).sort()).toEqual(Object.keys(raw.operations).sort());
    expect(of("journey").map((e) => e.name).sort(), "the model's journeys (none yet in Plugged In)").toEqual(Object.values(raw.journeys ?? {}).map((j) => (j as { name: string }).name).sort());
    expect(Object.fromEntries(of("refusal").map((e) => [e.name, e.code])), "refusal codes, from the model").toEqual(raw.refusals);
    expect(of("environment").map((e) => e.name).sort(), "the search index's environments").toEqual(declaredEnvironments());
    expect(of("monitor").length, "monitor pages are searchable").toBeGreaterThanOrEqual(1);
    for (const entry of (index ?? []).filter((e) => e.kind !== "monitor")) {
      expect(entry.href.startsWith("/portal/"), `${entry.kind} ${entry.name}`).toBe(true);
      if (entry.kind === "refusal") continue;
      expect((await get(ctx, withoutFragment(entry.href))).status, `${entry.kind} ${entry.name} at ${entry.href}`).toBe(200);
    }
    expect(leaked(text), "the index is a model, never a trace").toEqual([]);
  });
});

describe("21 J: the operation page's tabs and its calls table", () => {
  it("the tabs are Contract, Metrics, Proof, Docs and Notes; there is no Spans tab", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const { text } = await get(ctx, "/portal/operations/handle.claim");
    expect(parts(text, "op-tab").map((t) => t["data-tab"])).toEqual(["contract", "metrics", "proof", "docs", "notes"]);
    for (const tab of ["contract", "metrics", "proof", "docs", "notes"]) expect(parts((await get(ctx, `/portal/operations/handle.claim?tab=${tab}`)).text, "op-panel")[0], tab).toMatchObject({ "data-tab": tab });
    const spans = await get(ctx, "/portal/operations/handle.claim?tab=spans");
    expect(parts(spans.text, "op-panel").map((p) => p["data-tab"]), "an unknown tab shows no panel of its own name").not.toContain("spans");
  });

  it("Metrics ends with the calls table: its filters and columns as drawn, one row per call, newest first, each opening its trace", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { text } = await get(context(wire, run), "/portal/operations/handle.claim?tab=metrics");
    expect(parts(text, "calls-filter").map((f) => f["data-filter"]), "the filters").toEqual(["environment", "caller", "outcome", "request-key", "over-budget", "window"]);
    expect(parts(text, "calls-col").map((c) => c["data-col"]), "the columns").toEqual(["time", "environment", "caller", "outcome", "duration", "request-key", "attempts"]);
    const rows = parts(text, "call-row");
    expect(rows.map((r) => r["data-trace"]), "a retry is one call: the refused claim and the retried one, newest first").toEqual([run.ids.refused, run.ids.answered]);
    expect(rows[1], "the retried claim").toMatchObject({ "data-operation": "handle.claim", "data-outcome": "answered", "data-caller-kind": "person", "data-attempts": "2", "data-environment": "staging", "data-over-budget": "false" });
    expect(rows[1]!["data-duration-ms"], "the extent of its two attempt spans: the first's start to the second's end").toBe("11");
    expect(rows[0], "the refused one: the declared refusal").toMatchObject({ "data-outcome": "refused", "data-refusal": "HandleTaken", "data-caller-kind": "agent", "data-attempts": "1", "data-duration-ms": "9" });
    expect(rows[0]!["data-start"], "the span's start").toBe(String(at(4)));
    for (const trace of [run.ids.refused, run.ids.answered]) expect(text, `a link to ${trace}`).toContain(`href="/portal/traces/${trace}"`);
    expect(text, "the person is never named").not.toContain(PLANTED.person);
  });

  it("over budget is derived from the model's budget: link.add's slow defect is over, its quick answer is not", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const budget = wire.model.operations["link.add"]!.budget!.p95Ms;
    expect(budget, "a budget between the fixture's 9 ms and 300 ms").toBeGreaterThan(9);
    expect(budget).toBeLessThan(300);
    const rows = parts((await get(context(wire, run), "/portal/operations/link.add?tab=metrics")).text, "call-row");
    expect(rows.map((r) => [r["data-trace"], r["data-outcome"], r["data-caller-kind"], r["data-over-budget"]])).toEqual([
      [run.ids.defect, "defect", "anyone", "true"], [run.ids.added, "answered", "anyone", "false"],
    ]);
  });
});

describe("21 K: the metrics reader: door refusals are counted, named, and never a row", () => {
  it("the tiles and the refusals by code come from `ortho.calls`; a refusal that opened no span is in the counts and not in the table", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const model = rawOf();
    const { text } = await get(context(wire, run), "/portal/operations/handle.claim?tab=metrics");
    const tiles = Object.fromEntries(parts(text, "tile").map((t) => [t["data-stat"], t["data-value"]]));
    expect(tiles, "five calls: one answered, one refused with a span, three refused at the door").toMatchObject({ calls: "5", answered: "1", refused: "4", defects: "0" });
    const byCode = Object.fromEntries(parts(text, "refusal-code").map((r) => [r["data-refusal"], [r["data-code"], r["data-count"]]]));
    expect(byCode, "by name, mapped to the model's code").toEqual({ HandleTaken: [model.refusals!["HandleTaken"], "1"], NotAllowed: [model.refusals!["NotAllowed"], "3"] });
    const rows = parts(text, "call-row");
    expect(rows.length, "two spans, two rows").toBe(2);
    expect(rows.filter((r) => r["data-refusal"] === "NotAllowed"), "no row for a door refusal").toEqual([]);
    expect(parts(text, "calls-footer")[0], "the footer says what is counted and not listed").toMatchObject({ "data-shown": "2", "data-total": "5", "data-door-refusals": "3" });
    const home = (await get(context(wire, run), "/portal")).text;
    expect(parts(home, "last-call").length, "the rail does list the calls that have spans").toBe(2);
    expect(home, "and none of them is a door refusal").not.toContain('data-refusal="NotAllowed"');
    expect(parts(text, "call-row").length, "the hook exists in the table where a row would be").toBe(2);
  });

  it("the refusal-codes page counts every refusal by name and code, and says `no span` for the door's", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const model = rawOf();
    const { status, text } = await get(context(wire, run), "/portal/reference/refusals");
    expect(status).toBe(200);
    const rows = Object.fromEntries(parts(text, "ref-row").map((r) => [r["data-name"], r]));
    expect(Object.keys(rows).sort(), "every declared refusal has a row").toEqual(Object.keys(model.refusals!).sort());
    expect(rows["HandleTaken"], "refused once, with a span: its row opens the trace").toMatchObject({ "data-code": model.refusals!["HandleTaken"], "data-count": "1", "data-span": "trace", "data-trace": run.ids.refused });
    expect(rows["NotAllowed"], "refused three times at the door: counted, no span").toMatchObject({ "data-code": model.refusals!["NotAllowed"], "data-count": "3", "data-span": "none" });
    expect(rows["LinkNotListed"]!["data-count"], "never refused in the window").toBe("0");
  });

  it("a metrics source that fails gives a page with no numbers and no guess", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const broken = { ...ctx, live: { ...(ctx as unknown as { live: object }).live, metrics: { window: () => Effect.fail(new SourceFailed({ message: "the reader is down" })) } } } as unknown as PortalContext;
    const { status, text } = await get(broken, "/portal/operations/handle.claim?tab=metrics");
    expect(status, "a failed read is not a failed page").toBe(200);
    expect(parts(text, "tile"), "no tile with a made-up zero").toEqual([]);
    expect(parts(text, "not-yet").map((n) => n["data-hole"]), "it says so").toContain("metrics");
  });
});

describe("21 L: what the portal cannot fill yet says `not yet`", () => {
  it("the request key and the role held, in every row of the calls table and in the filters", async () => {
    const wire = await decode(pluggedInWire());
    const { text } = await get(context(wire, stage(wire)), "/portal/operations/handle.claim?tab=metrics");
    const rows = parts(text, "call-row");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect([row["data-request-key"], row["data-role-held"]], `row ${row["data-trace"]}`).toEqual(["not yet", "not yet"]);
    expect(parts(text, "calls-filter").find((f) => f["data-filter"] === "request-key"), "no request key to filter on").toMatchObject({ "data-available": "false" });
    expect(parts(text, "not-yet").map((n) => n["data-hole"]).sort()).toEqual(expect.arrayContaining(["request-key", "role-held"]));
  });

  it("per-eval verdicts on the Proof tab: the aggregate verdict per environment, and `not yet` where the nine evals would be", async () => {
    const wire = await decode(pluggedInWire());
    const { text } = await get(context(wire, stage(wire)), "/portal/operations/handle.claim?tab=proof");
    expect(parts(text, "proof-cell").map((c) => c["data-environment"]).sort(), "the aggregate, per environment").toEqual(declaredEnvironments());
    for (const cell of parts(text, "proof-cell")) expect(cell["data-state"], "no logbook is configured in this fixture: nothing is recorded").toBe("unavailable");
    const evals = parts(text, "eval-verdicts");
    expect(evals.length, "a per-eval block for each declared environment").toBe(declaredEnvironments().length);
    for (const e of evals) expect(e["data-state"]).toBe("not yet");
    expect(parts(text, "not-yet").map((n) => n["data-hole"])).toContain("per-eval");
  });

  const declared = () => Object.values((pluggedInWire() as { model: { journeys?: Record<string, { steps: ReadonlyArray<unknown> }> } }).model.journeys ?? {});

  it("journeys come from the model: the page draws each declared journey and its declared steps, whatever the window's traces hold", async () => {
    const wire = await decode(pluggedInWire());
    const journeys = declared();
    expect(journeys.length, "Plugged In declares journeys on the wire (the climb's seven)").toBeGreaterThan(0);
    const { status, text } = await get(context(wire, stage(wire)), "/portal/journeys");
    expect(status).toBe(200);
    expect(parts(text, "journeys-empty").length, "journeys are declared: no declared-none state").toBe(0);
    expect(parts(text, "journey").length, "one journey drawn for each declared").toBe(journeys.length);
    expect(parts(text, "journey-step").length, "the declared steps, and the staged trace's `journey.*` span adds none").toBe(journeys.reduce((n, j) => n + j.steps.length, 0));
  });

  it("with no journey declared the page says so and draws no step, whatever the window's traces hold", async () => {
    // The digest is over the whole document, so a changed wire is signed again, as the generator would sign it.
    const { digest: _, ...unsigned } = structuredClone(pluggedInWire()) as { model: { journeys?: unknown }; digest: string };
    unsigned.model.journeys = {};
    const wire = await decode({ ...unsigned, digest: Wire.digestOf(unsigned) });
    const { status, text } = await get(context(wire, stage(wire)), "/portal/journeys");
    expect(status).toBe(200);
    expect(parts(text, "journeys-empty").length, "the declared-none state").toBe(1);
    expect(parts(text, "journey-step"), "the staged trace's `journey.*` span is not a journey").toEqual([]);
    expect(parts(text, "journey"), "nor is it drawn as one").toEqual([]);
  });
});
