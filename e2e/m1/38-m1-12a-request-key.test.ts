// Check 38 (M1.12a): the request key on the operation's span, and the calls table that shows it and filters by it (`design/portal.md`, hole 1).
// The done-when: "a call made with a key has `request.key` on its operation span, and the calls table filters by it". Three halves:
//   A  the span: acme in a local world (workerd and a Collector, no Docker, no cloud). A call made with an `idempotency-key` has `request.key` on
//      every attempt's operation span, as the caller sent it (never the store's `<op>|<who>|<key>`); its replay (the same key, which changed
//      nothing) has it too, with `request.replayed`; a keyed refusal has it on the operation's span (a declared refusal) and on `<op>.refused` (a role's
//      refusal); a call with no key has none, and a key sent to an operation that keeps no answer by key is not one it honours, so none.
//      The retry is judged on a real race: eight concurrent keyed spends on one allowance, repeated until a call has lost its commit and run again, and the
//      test fails (never skips) if no call ever retried; every attempt span of a retried call must carry the key.
//   B  the data: the portal's own data API (`@orthograph/portal/server`, run here) reads a window's spans into `telemetry.calls[].requestKey`: the
//      key as sent, once for a call that took two attempts, `null` for a call with none (never a string: the table words the gap).
//      The rule, pinned here (`design/portal.md` says only "the key as sent"): `requestKey` is the key any of the call's attempt spans carries, so it is the same
//      whether all attempts, only the first or only the retry's span carry it (the windows `true`, `"first"` and `"retry"` of `request-key-fixture.ts`).
//   C  the table: in a window where some calls carry a key, the calls table shows each call's key (the `data-request-key` hook and the cell under the
//      `request-key` column), a keyless row says `none` (the builder's word, kept: the design gives none; `not yet` is for a window that has no key at all, check 21 L),
//      and the request-key filter takes a part of a key (not only its start) and leaves the calls whose key has it, and no other, the keyless ones included.
//      The real portal's client is built with HeroUI Pro, which needs a licence: C on the real portal runs in CI only, as check 28's real-portal tests do. Here,
//      the same judge reads a stand-in client over the real data API, and every fault it must refuse is planted in that stand-in (the controls).
// Hooks: check 21's (`calls-filter[data-filter]`, `calls-col[data-col]`, `call-row[data-trace][data-request-key]`); the filter holds an `input` (the one thing
// 21 did not say). Red before M1.12a: no `request.key` anywhere, `requestKey` always `null`, the filter unavailable.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Wire, type BlueprintWire } from "@orthograph/portal";
import { PortalServer } from "@orthograph/portal/server";
import type { Span } from "@orthograph/prove";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import { KEYS, contextOf, window as windowOf, type Window } from "./request-key-fixture.ts";
import { judge, NO_KEY, type Expected } from "./request-key-judge.ts";
import { standIn } from "./request-key-standin.ts";
import { startWorld, type Seen } from "./request-key-world.ts";
import { acme, copyOf, nothingRunning, repo, succeeds } from "./support.ts";

afterAll(async () => { await ServedPortals.closeAll(); });

// ---- A: the span ----

const SENT = "m112a.Spend-Key_01";
let copy: ReturnType<typeof copyOf>;
let seen: Seen;
const scope = Effect.runSync(Scope.make());
beforeAll(async () => {
  copy = copyOf(acme);
  succeeds(copy.root, "generate");
  seen = await startWorld(copy.root, "m1-12a", scope);
}, 300_000);
afterAll(async () => { await Effect.runPromise(Scope.close(scope, Exit.void)); if (copy) { nothingRunning(copy.root); copy.remove(); } });

/** An organisation of ada's with a 500 allowance of olga's (made with no key). */
const fund = async () => {
  const people = await seen.cast("ada", "olga");
  const ada = people["ada"]!;
  const olga = people["olga"]!;
  const created = await seen.call("organization/create", ada.token, { name: "M1.12a", cap: "1000" });
  const granted = await seen.call("allowance/grant", ada.token, { organization: created.body["organization"], member: olga.person, limit: "500" });
  return { allowance: granted.body["allowance"] as string, ada, olga, setup: [created, granted] };
};
const spend = (who: { token: string }, allowance: string, amount: string, key?: string) => seen.call("allowance/spend", who.token, { allowance, amount, memo: "m1-12a" }, key);
/** The spans a call's operation made: the handler's attempts (`allowance.spend`) and its role refusal (`allowance.spend.refused`), never a step's. */
const operation = (spans: ReadonlyArray<Span>, name: string) => spans.filter((s) => s.attrs["operation"] === name && typeof s.attrs["attempt"] === "number");
const keys = (spans: ReadonlyArray<Span>) => spans.map((s) => s.attrs["request.key"]);

describe("38 A: request.key is on the operation's span", () => {
  it("a call made with a key has it on its operation span, as the caller sent it, and its replay has it too", async () => {
    const { allowance, olga } = await fund();
    const first = await spend(olga, allowance, "100", SENT);
    const again = await spend(olga, allowance, "100", SENT);
    expect([first.status, first.body], first.text).toEqual([200, { remaining: "400" }]);
    expect([again.status, again.body], "the replay is answered with the first answer").toEqual([200, { remaining: "400" }]);
    const one = operation(await seen.spans(first.trace), "allowance.spend");
    expect(one.length, "at least the attempt that committed").toBeGreaterThan(0);
    expect(keys(one), "every attempt of the keyed call carries the key as sent, never the store's `allowance.spend|<person>|<key>`").toEqual(one.map(() => SENT));
    const replay = operation(await seen.spans(again.trace), "allowance.spend");
    expect(replay.length, "the replay opens its operation span").toBeGreaterThan(0);
    expect(keys(replay), "the replay carries the same key").toEqual(replay.map(() => SENT));
    expect(replay.map((s) => s.attrs["request.replayed"]), "and says it was a replay").toContain(true);
    expect(one.map((s) => s.attrs["request.replayed"]), "the first call was not one").not.toContain(true);
    for (const span of [...one, ...replay]) expect(span.attrs, "no other attribute holds the stored key").not.toHaveProperty("request.stored");
    expect(JSON.stringify([...one, ...replay].map((s) => s.attrs)), "the person and the operation are never glued onto the key").not.toMatch(/allowance\.spend\||\|per_/);
  });

  it("a keyed call that lost its commit race and retried has the key on every attempt's span, the retry's included", { timeout: 240_000 }, async () => {
    // Concurrent keyed spends on one allowance race for its version: the loser's commit says `conflict` and the handler runs again (`attempt` 2, 3, ...).
    // A round of eight, each with its own key, is repeated until one call has retried; if none has after twelve rounds the test FAILS (never skips,
    // never passes without a retried attempt to read).
    const { allowance, olga } = await fund();
    const racers: Array<{ readonly key: string; readonly trace: string; readonly spans: ReadonlyArray<Span> }> = [];
    let retried: typeof racers = [];
    for (let round = 0; round < 12 && retried.length === 0; round++) {
      const calls = await Promise.all(Array.from({ length: 8 }, (_, i) => { const key = `m112a-race-${round}-${i}`; return spend(olga, allowance, "1", key).then((call) => ({ key, call })); }));
      for (const { key, call } of calls) {
        expect([call.status, Object.keys(call.body)], `${key}: ${call.text}`).toEqual([200, ["remaining"]]);
        racers.push({ key, trace: call.trace, spans: operation(await seen.spans(call.trace), "allowance.spend") });
      }
      retried = racers.filter((r) => r.spans.some((s) => (s.attrs["attempt"] as number) >= 2));
    }
    expect(retried.length, `no keyed call retried in ${racers.length} concurrent spends: the race this test needs never happened, so it judged nothing (a failure, not a skip)`).toBeGreaterThan(0);
    for (const r of retried) {
      const attempts = r.spans.map((s) => s.attrs["attempt"] as number);
      expect(Math.max(...attempts), `${r.key} has a span at attempt >= 2`).toBeGreaterThanOrEqual(2);
      expect(new Set(attempts).size, "one operation span per attempt number, none missing").toBe(attempts.length);
      expect(keys(r.spans), `every attempt's span (attempts ${attempts.join(", ")}) of ${r.key} carries the key as sent, the retry's too`).toEqual(r.spans.map(() => r.key));
    }
    // The first attempt lost a commit race: the retry is a real one, not a span the test made up (a commit span says `conflict`, as the portal reads it).
    const conflicts = (await Promise.all(retried.map((r) => seen.spans(r.trace)))).flat().filter((s) => s.attrs["commit.outcome"] === "conflict");
    expect(conflicts.length, "the attempts that retried lost their commit (`commit.outcome` conflict)").toBeGreaterThan(0);
  });

  it("a call made with no key has none on any span, and nor does a key sent to an operation that keeps no answer by key", async () => {
    const { allowance, ada, olga, setup } = await fund();
    const keyless = await spend(olga, allowance, "10");
    expect(operation(await seen.spans(keyless.trace), "allowance.spend").length, "the keyless spend opened its operation span").toBeGreaterThan(0);
    for (const call of [keyless, ...setup]) expect((await seen.spans(call.trace)).filter((s) => "request.key" in s.attrs).map((s) => s.name), `a keyless call (${call.trace}) carries no request.key, on any span`).toEqual([]);
    const revoked = await seen.call("allowance/revoke", ada.token, { allowance }, "m112a-revoke-key");
    expect(revoked.status, revoked.text).toBe(200);
    const spans = await seen.spans(revoked.trace);
    expect(operation(spans, "allowance.revoke").length).toBeGreaterThan(0);
    expect(spans.filter((s) => "request.key" in s.attrs).map((s) => s.name), "allowance.revoke is not idempotent by request: the key it was sent is not one it honours").toEqual([]);
  });

  it("a keyed refusal carries the key: a declared refusal on the operation's span, a role's refusal on `<op>.refused`", async () => {
    const { allowance, ada, olga } = await fund();
    const exceeded = await spend(olga, allowance, "9000", "m112a-exceeded-key");
    expect(exceeded.body["_tag"], exceeded.text).toBe("AllowanceExceeded");
    const declared = operation(await seen.spans(exceeded.trace), "allowance.spend");
    expect(declared.map((s) => s.attrs["refusal"]), "the operation's span says what it refused").toContain("AllowanceExceeded");
    expect(keys(declared), "and carries the key").toEqual(declared.map(() => "m112a-exceeded-key"));
    const notAllowed = await spend(ada, allowance, "10", "m112a-notallowed-key");
    expect(notAllowed.body["_tag"], "ada is not the grantee").toBe("NotAllowed");
    const refused = (await seen.spans(notAllowed.trace)).filter((s) => s.name === "allowance.spend.refused");
    expect(refused.length, "the refused caller leaves `<operation>.refused`").toBe(1);
    expect(refused[0]!.attrs, "which carries the refusal and the key").toMatchObject({ refusal: "NotAllowed", "request.key": "m112a-notallowed-key" });
    const unkeyed = await spend(ada, allowance, "10");
    expect((await seen.spans(unkeyed.trace)).filter((s) => s.name === "allowance.spend.refused").map((s) => "request.key" in s.attrs), "a refusal with no key has none").toEqual([false]);
  });
});

// ---- B: the data ----

const pluggedIn = (): Promise<BlueprintWire> => Effect.runPromise(Wire.decode(JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/portal/blueprint.json"), "utf8"))));
interface Row { readonly trace: string; readonly operation: string; readonly requestKey: unknown }
/** The calls the data API lists for the window (`telemetry.calls`, available). */
const rowsOf = async (wire: BlueprintWire, run: Window): Promise<ReadonlyArray<Row>> => {
  const response = await Effect.runPromise(PortalServer.handle(contextOf(wire, run), new Request(`http://portal.test/_portal/v1/snapshot?digest=${wire.digest}`)));
  expect(response.status).toBe(200);
  const { telemetry } = (await response.json()) as { readonly telemetry: { readonly calls: { readonly state: string; readonly value: { readonly rows: ReadonlyArray<Row> } } } };
  expect(telemetry.calls.state, "the window's calls are readable").toBe("available");
  return telemetry.calls.value.rows;
};

describe("38 B: the data API reads the key into the calls", () => {
  it("control: the window is what it says: five calls, three keys, a replay, a refusal and a keyless call", async () => {
    const run = windowOf(await pluggedIn());
    expect(run.calls.map((c) => c.key), "newest first").toEqual([null, KEYS.refused, KEYS.other, KEYS.claim, KEYS.claim]);
    expect(run.traces.size).toBe(5);
    expect([...run.traces.values()].flatMap((t) => t.spans).filter((s) => "request.key" in s.attrs).length, "five spans carry a key (the retried call's two, the others' one each)").toBe(5);
  });

  it("each call's `requestKey` is the key its spans carry, as sent; one for a call of two attempts; `null` for a call with none", async () => {
    const wire = await pluggedIn();
    const run = windowOf(wire);
    expect((await rowsOf(wire, run)).map((c) => [c.trace, c.requestKey]), "newest first, the key per call").toEqual(run.calls.map((c) => [c.trace, c.key]));
  });

  it.each([
    ["only the retry (attempt 2) carries it", "retry"],
    ["only the first attempt carries it", "first"],
  ] as const)("a call of two attempts where %s: its `requestKey` is still the key, whichever attempt it is on", async (_name, keyed) => {
    const wire = await pluggedIn();
    const run = windowOf(wire, keyed);
    const retried = [...run.traces.values()].flatMap((t) => t.spans).filter((s) => s.attrs["attempt"] === 2);
    expect(retried.map((s) => "request.key" in s.attrs), "control: the window is what it says: the retry carries the key only in `retry`").toEqual([keyed === "retry"]);
    expect([...run.traces.values()].flatMap((t) => t.spans).filter((s) => s.attrs["attempt"] === 1 && "request.key" in s.attrs).length, "and the first attempts: all four keyed in `first`, three of four (not the retried call's) in `retry`").toBe(keyed === "first" ? 4 : 3);
    const rows = await rowsOf(wire, run);
    expect(rows.map((c) => [c.trace, c.requestKey]), "the retried call (the oldest) has its key, the others theirs").toEqual(run.calls.map((c) => [c.trace, c.key]));
    expect(rows[rows.length - 1]!.requestKey, "the retried call's key is the one sent").toBe(KEYS.claim);
  });

  it("in a window from before the spans carried a key, every `requestKey` is `null` (the table says `not yet`, check 21 L)", async () => {
    const wire = await pluggedIn();
    const rows = await rowsOf(wire, windowOf(wire, false));
    expect(rows.length).toBe(5);
    expect(rows.map((c) => c.requestKey)).toEqual([null, null, null, null, null]);
  });
});

// ---- C: the table ----

const ROUTE = "/portal/operations/handle.claim?tab=metrics";
const expectedOf = (run: Window): Expected => {
  const [keyless, refused, other, replay, call] = run.calls.map((c) => c.trace) as [string, string, string, string, string];
  const both = [replay, call];
  return {
    calls: run.calls,
    terms: [
      ["7f31", both], // the middle of the key: no key starts with it
      ["claim-7f31-abc", both], // the whole key: the call and its replay
      ["claim", both], // the start
      ["abc", both], // the end
      ["4c9e", [refused]], // the keyed refusal's
      ["0b52", [other]],
      ["-", [refused, other, replay, call]], // every key has one: the keyless call is not in it
      ["handle", []], // the operation's name is not in any key
      ["answered", []], // nor is the outcome
      [NO_KEY, []], // `none` is how the table words a gap, not a key
      ["no-such-key", []],
      ["", [keyless, refused, other, replay, call]], // cleared: every call again
    ],
  };
};

describe("38 C: the calls table shows the key and filters by it (the real portal, CI only)", () => {
  it("a window with keys: each call's key is shown (`none` where there is none), and the filter keeps the calls whose key has the part typed", { timeout: 300_000 }, async () => {
    const wire = await pluggedIn();
    const run = windowOf(wire);
    const portal = await ServedPortals.open({ context: contextOf(wire, run) });
    expect(await judge(portal, ROUTE, expectedOf(run))).toEqual([]);
  });
});

// ---- the controls: the judge against a stand-in client over the real data API ----

const dirs: Array<string> = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const judged = async (planted: ReadonlyArray<readonly [string, string]>) => {
  const wire = await pluggedIn();
  const run = windowOf(wire);
  const dir = mkdtempSync(join(tmpdir(), "request-key-standin-"));
  dirs.push(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), standIn(planted));
  const portal = await ServedPortals.open({ context: contextOf(wire, run), clientDir: dir });
  try { return await judge(portal, ROUTE, expectedOf(run)); } finally { await portal.close(); }
};

describe("38 control: the judge", () => {
  it("passes a table that is right: the real data API, a stand-in client, a key shown and a part of it filtered", { timeout: 120_000 }, async () => {
    expect(await judged([])).toEqual([]);
  });
});

const SHOWN = `/*SHOWN*/ c.requestKey ?? (keyed ? "none" : "not yet")`;
const MATCH = `/*MATCH*/ (c.requestKey ?? "").includes(term)`;
describe.each([
  // the filter
  ["a filter that matches the start of a key only", "request-key filter", [[MATCH, `(c.requestKey ?? "").startsWith(term)`]]],
  ["a filter that matches the end of a key only", "request-key filter", [[MATCH, `(c.requestKey ?? "").endsWith(term)`]]],
  ["a filter that ignores what is typed", "request-key filter", [[MATCH, `true`]]],
  ["a filter that matches the whole key only", "request-key filter", [[MATCH, `(c.requestKey ?? "") === term || term === ""`]]],
  ["a filter that matches the row's other text (operation, outcome, `none`)", "request-key filter", [[MATCH, `((c.requestKey ?? "none") + c.operation + c.outcome).includes(term)`]]],
  ["a filter that keeps every keyless call whatever is typed", "request-key filter", [[MATCH, `c.requestKey === null || c.requestKey.includes(term)`]]],
  ["a filter that, cleared, lists only the keyed calls", "request-key filter", [[MATCH, `term === "" ? c.requestKey !== null : (c.requestKey ?? "").includes(term)`]]],
  ["a filter that works for the first term typed only", "request-key filter", [[`input.addEventListener("input", () => {`, `let once = false; input.addEventListener("input", () => { if (once) return; once = true;`]]],
  ["a filter with nothing to type into", "no visible `input`", [[`<input type="search" />`, `<input type="search" hidden />`]]],
  ["a filter that says it is not available in a window with keys", "data-available", [[`/*AVAILABLE*/ keyed`, `false`]]],
  ["no request-key filter at all", "no `request-key` filter", [[`["environment", "caller", "outcome", "request-key", "over-budget", "window"]`, `["environment", "caller", "outcome", "over-budget", "window"]`]]],
  // the column and the key shown
  ["no request-key column", "no `request-key` column", [[`"duration", "request-key", "attempts"`, `"duration", "attempts"`]]],
  ["the stored `<op>|<who>|<key>` shown instead of the key", "data-request-key is", [[SHOWN, `c.requestKey === null ? "none" : c.operation + "|per_ada|" + c.requestKey`]]],
  ["a keyless call that says `not yet`, in a window with keys", "data-request-key is", [[SHOWN, `c.requestKey ?? "not yet"`]]],
  ["a keyless call that says nothing", "data-request-key is", [[SHOWN, `c.requestKey ?? ""`]]],
  ["a keyless call that is given a key (its trace id)", "data-request-key is", [[SHOWN, `c.requestKey ?? c.trace`]]],
  ["a key shown only for the call that retried", "data-request-key is", [[SHOWN, `c.attempts === 2 ? c.requestKey : "none"`]]],
  ["a replay that shows no key (the same key as its call)", "data-request-key is", [[SHOWN, `c.requestKey === ${JSON.stringify(KEYS.claim)} && c.attempts === 1 ? "none" : c.requestKey ?? "none"`]]],
  ["a keyed refusal that shows no key", "data-request-key is", [[SHOWN, `c.outcome === "refused" ? "none" : c.requestKey ?? "none"`]]],
  ["the key in the attribute and `not yet` in the cell", "the request-key cell reads", [[`esc(/*CELL*/ shown(c))`, `"not yet"`]]],
  ["the key in the cell and nothing in the attribute", "data-request-key is", [[`data-request-key="' + esc(shown(c)) + '"`, `data-request-key="' + '"`]]],
] as ReadonlyArray<readonly [string, string, ReadonlyArray<readonly [string, string]>]>)("38 control: the judge refuses", (name, said, planted) => {
  it(name, { timeout: 120_000 }, async () => {
    const found = await judged(planted);
    expect(found.some((f) => f.includes(said)), `${said}\n${found.join("\n")}`).toBe(true);
  });
});
