// Check 31 (S-19 / HAN-18, G5 section 6, ST1.11): one call that moves a value between holders. On D1 a unique index is checked statement by statement, with no deferred
// check, so a call that writes A `x` to `y` and then B `y` to `z` is refused at its first statement, and the handler retries the same doomed batch 64 times and dies as
// "lost its version race"; the memory store checks final values only and passes what D1 refuses. The fix (ST1.12) orders the unit's writes (a row that frees a key
// before a row that takes it) and makes a call that cannot be ordered, or that clashes with its own rows, a defect naming the rule, with no retry.
//
// Real workerd and a real local D1, no Docker, port from the OS, on the fixtures `unique-fields` (`handle`, whose rule `handle.oneHolderPerName` holds a name once while `claimed`, in `invariants.ts`) overlaid
// with `value-moves` (two operations that write two handles in one call: `handle.rename-two`, and `handle.claim-twice`, which makes its own row and one more under one name).
// Respelled at ST1.20 from G4's `unique` property onto `invariants.ts`, and the defect's name is now the rule's (`handle.oneHolderPerName`); the cases and their answers did not change.
// The same cases at the stores themselves are `packages/language-effect/src/modules/records/write-order.test.ts` (unit and memory) and
// `packages/host-cloudflare/src/modules/store/write-order.test.ts` (D1). Written by the checks author; a builder never edits this file or those fixtures.
//
// Controls (true today): a plain claim, a real ten-way race, a call that renames two handles to two free names, and a chain the handler already writes in the freeing order. Red today, for the missing ordering only:
// the shift commits (A `x` to `y`, B `y` to `z`), once; a swap and a clash among the call's own rows die with a single attempt and a first defect line that names the rule `handle.oneHolderPerName`.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as W from "./loop-world.ts";
import { acme, copyOf, fixtures, succeeds } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

let opened: Promise<W.Loop> | undefined;
let kept: ReturnType<typeof copyOf> | undefined;
const world = () => (opened ??= (() => {
  const copy = copyOf(acme);
  kept = copy;
  for (const overlay of ["unique-fields", "value-moves"]) cpSync(join(fixtures, overlay), copy.root, { recursive: true });
  succeeds(copy.root, "generate");
  return W.openLoop(copy.root);
})());
afterAll(async () => { await (await opened?.catch(() => undefined))?.close(); kept?.remove(); });

const call = async (route: string, body: object) => {
  const loop = await world();
  const response = await fetch(`${loop.url}/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await response.text();
  const json = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return { raw: text }; } })();
  return { status: response.status, body: json, trace: W.tracesOf(loop, `/${route}`).at(-1) };
};
const claim = async (name: string) => {
  const r = await call("handle/claim", { name });
  expect(r.status, `claiming ${name}`).toBe(200);
  return String(r.body["handle"]);
};
const tag = (r: { status: number; body: Record<string, unknown> }) => (r.status >= 400 && r.status < 500 ? r.body["_tag"] : `status ${r.status}`);

/** What one call did on its span and how many times it tried to commit. A call with no trace, or no such span in 30 s, fails its test by name. */
const trace = async (operation: string, r: { trace: string | undefined }) => {
  expect(r.trace, "the call has a trace").toBeDefined();
  const loop = await world();
  const read = W.until(() => loop.spans(r.trace!), (spans) => W.named(spans, operation) !== undefined, 20_000);
  const spans = await Promise.race([read, new Promise<never>((_, reject) => { setTimeout(() => reject(new Error(`no ${operation} span for trace ${r.trace} within 30 s`)), 30_000); })]);
  expect(W.named(spans, operation), `a ${operation} span`).toBeDefined();
  // The handler writes a defect's first line on the operation's span as `defect`; every attempt has such a span, so read the one that carries it.
  const defects = spans.filter((s) => s.name === operation).map((s) => String(s.attrs["defect"] ?? "")).filter((d) => d !== "");
  return {
    defect: defects.at(-1) ?? "",
    commits: spans.filter((s) => s.name === `${operation}.commit`).length,
  };
};

describe("31 controls: what commits today", () => {
  it("a plain claim answers a handle, and a taken name is the declared refusal", async () => {
    const id = await claim("control-a");
    expect(id).toMatch(/^hdl_/);
    expect(tag(await call("handle/claim", { name: "control-a" }))).toBe("HandleTaken");
  });

  it("ten concurrent claims of one name: one wins, nine are HandleTaken, none is a defect", { timeout: 300_000 }, async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => call("handle/claim", { name: "control-race" })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => tag(r) === "HandleTaken")).toHaveLength(9);
  });

  it("a chain named in the freeing order (B `y` to `z` first, then A `x` to `y`) commits, once", { timeout: 300_000 }, async () => {
    const a = await claim("chain-x");
    const b = await claim("chain-y");
    const moved = await call("handle/rename-two", { first: b, second: a, firstTo: "chain-z", secondTo: "chain-y" });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect((await trace("handle.rename-two", moved)).commits).toBe(1);
  });

  it("a call that renames two handles to two free names commits, once", async () => {
    const a = await claim("control-b1");
    const b = await claim("control-b2");
    const renamed = await call("handle/rename-two", { first: a, second: b, firstTo: "control-b3", secondTo: "control-b4" });
    expect(renamed.status).toBe(200);
    expect((await trace("handle.rename-two", renamed)).commits).toBe(1);
    expect(tag(await call("handle/claim", { name: "control-b3" }))).toBe("HandleTaken");
    expect((await call("handle/claim", { name: "control-b1" })).status, "the old name is free").toBe(200);
  });
});

describe("31 S-19: a value moving between holders in one call", () => {
  it("A `x` to `y`, then B `y` to `z`: the call commits, on its first try, and the names land", { timeout: 300_000 }, async () => {
    const a = await claim("move-x");
    const b = await claim("move-y");
    const moved = await call("handle/rename-two", { first: a, second: b, firstTo: "move-y", secondTo: "move-z" });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    const seen = await trace("handle.rename-two", moved);
    expect(seen.commits, "one attempt: the unit wrote B before A").toBe(1);
    expect(seen.defect).toBe("");
    expect((await call("handle/claim", { name: "move-x" })).status, "x is free now").toBe(200);
    expect(tag(await call("handle/claim", { name: "move-y" })), "A holds y").toBe("HandleTaken");
    expect(tag(await call("handle/claim", { name: "move-z" })), "B holds z").toBe("HandleTaken");
  });

  it("a straight swap (A `x` to `y`, B `y` to `x`) has no order: a defect naming the rule, one attempt, nothing written", { timeout: 300_000 }, async () => {
    const a = await claim("swap-x");
    const b = await claim("swap-y");
    const swapped = await call("handle/rename-two", { first: a, second: b, firstTo: "swap-y", secondTo: "swap-x" });
    expect(swapped.status, "a defect, not a refusal and not a success").toBeGreaterThanOrEqual(500);
    const seen = await trace("handle.rename-two", swapped);
    expect(seen.defect, "the defect's first line says which rule").toMatch(/unique rule handle\.oneHolderPerName\b/);
    expect(seen.defect, "the app's own bug and the compiler's list are other defects").not.toMatch(/names no refusal|did not list/);
    expect(seen.defect, "never the retry loop's words").not.toMatch(/version race/);
    expect(seen.commits, "no retry: the call cannot succeed however often it runs").toBeLessThanOrEqual(1);
    expect(tag(await call("handle/claim", { name: "swap-x" })), "x is still held").toBe("HandleTaken");
    expect(tag(await call("handle/claim", { name: "swap-y" })), "y is still held").toBe("HandleTaken");
  });

  it("a call that makes two claimed handles under one name clashes with itself: a defect naming the rule, one attempt, nothing written", { timeout: 300_000 }, async () => {
    const clashed = await call("handle/claim-twice", { name: "clash-n", other: "hdl_clashother" });
    expect(clashed.status, `a defect, not HandleTaken: ${JSON.stringify(clashed.body)}`).toBeGreaterThanOrEqual(500);
    expect(tag(clashed)).not.toBe("HandleTaken");
    const seen = await trace("handle.claim-twice", clashed);
    expect(seen.defect, "the defect's first line says which rule").toMatch(/unique rule handle\.oneHolderPerName\b/);
    expect(seen.defect, "the app's own bug and the compiler's list are other defects").not.toMatch(/names no refusal|did not list/);
    expect(seen.defect).not.toMatch(/version race/);
    expect(seen.commits, "no retry").toBeLessThanOrEqual(1);
    expect((await call("handle/claim", { name: "clash-n" })).status, "nothing of that call was written").toBe(200);
  });
});
