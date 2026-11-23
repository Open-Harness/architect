// Check 20 (M1.41; design/decisions/K13-lock-down-first.md): the Plugged In loop, end to end, through the real `ortho`
// binary in a fresh folder. Written by the ✍️ author before M1.42 and M1.43; a builder never edits it.
//
// `examples/plugged-in` (M1.40) is copied into a fresh folder with no `generated/`, and `ortho generate` writes every output.
// Each output is then read for K13's grid, one test per cell, the cell in the title as `<row> x <column> <mark>`: a check
// mark is true when M1.40 lands, `~` and `✗` are what M1.42 (and M1.36) make true. Then the server runs on workerd with
// prove's local Collector (no Docker), every operation is called through the SDK and through the CLI, and the refused claim
// prints its code and exits as the model says. Every value is judged against `generated/model/model.json`, never a literal:
// the only literals are the names and exits `M1-plugged-in.md` fixes (things, operations, `HandleTaken` exit 10).
//
// Groups: "controls" run the same readers on acme and pass today (they prove the instruments can pass); "outputs" are the
// grid, read from the generated files and the portal's data file; "loop" is the running app. With no examples/plugged-in
// every test of the last two fails at once, saying so.
//
// Expected once M1.40 is on m1 (empty handlers): green are the ✓ cells (operations everywhere, steps kept out of clients,
// machines, thing descriptions, the API's events, errors, codes and exits, names and exits, the world starting).
// Red until M1.42 (the `~` and `✗` cells): the SDK's thing and event types, the CLI's typed flags and help, MCP's described
// inputs, and the portal data file's field description and visibility (fields have no description in the model yet).
// The portal's events, errors with codes and step details pass already, because the data file
// (`generated/portal/blueprint.json`) copies the whole model: this check covers the data file only. The viewer's wire types
// (packages/portal/src/modules/wire/types.ts) are M1.13's part of those cells. Step details are judged on a fixture step
// that carries `optional` and `writes` (e2e/fixtures/m1/step-details, overlaid on a copy of acme, as check 17 does), since
// Plugged In's own steps carry none. Red until M1.43 (the handlers): every call that must commit. Red until M1.36 as
// well: `event.name` on the commit span and `refusal.code`.
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acme, fixtures, nothingRunning, textAt } from "./support.ts";
import * as L from "./loop.ts";
import * as W from "./loop-world.ts";

const make = (example: string, overlay?: string) => {
  const copy = L.freshProject(example, overlay);
  return { root: copy.root, remove: copy.remove, m: L.modelOf(copy.root), portal: L.portalOf(copy.root) };
};
type Project = ReturnType<typeof make>;
const cleanup: Array<() => unknown> = [];
afterAll(async () => { for (const stop of cleanup.splice(0).reverse()) await stop(); });

// ---- controls: the readers, on acme, true today ----

describe("20 controls: the instruments pass on acme", () => {
  let p: Project;
  beforeAll(() => { p = make(acme); cleanup.push(() => { p.remove(); nothingRunning(p.root); }); });

  it("operation and read x SDK, CLI, MCP, portal ✓: each operation is in all four", () => {
    expect(L.operations(p.m).length).toBeGreaterThan(10);
    expect([L.sdkMissing(p.root, p.m), L.cliMissing(p.root, p.m), L.mcpMissing(p.root, p.m), L.portalOperationDiffs(p.portal, p.m)]).toEqual([[], [], [], []]);
  });
  it("step x SDK, CLI, MCP ✗ by design: no client names a step; the machine and a thing's description reach the portal", () => {
    expect(L.operations(p.m).flatMap((op) => Object.values(op.steps)).length).toBeGreaterThan(10);
    expect([L.stepsInClients(p.root, p.m), L.portalMachineDiffs(p.portal, p.m), L.portalThingDescriptionDiffs(p.portal, p.m)]).toEqual([[], [], []]);
  });
  it("event and error x API ✓: the server speaks the model's events, errors, codes and exits", () => {
    expect(L.things(p.m).flatMap((t) => Object.keys(t.errors)).length).toBeGreaterThan(3);
    expect(L.apiDiffs(p.root, p.m)).toEqual([]);
  });
});

describe("20 K13 grid: a step with details (a fixture overlaid on acme)", () => {
  it("step x portal ~: a step's `optional` and `writes` are in the portal's data file as the model has them", () => {
    const p = make(acme, join(fixtures, "step-details"));
    try {
      const step = p.m.operations["badge.award"]?.steps["save"];
      expect([step?.optional, step?.writes?.length], "the model carries the details").toEqual([true, 1]);
      expect(L.portalStepDiffs(p.portal, p.m)).toEqual([]);
      expect(p.portal.operations["badge.award"]?.steps["save"]).toMatchObject({ optional: true });
    } finally { p.remove(); }
  });
});

// ---- the grid, read from what `ortho generate` wrote ----

describe("20 K13 grid: Plugged In's outputs", () => {
  let p: Project;
  beforeAll(() => { p = make(L.requireExample()); cleanup.push(() => { p.remove(); nothingRunning(p.root); }); });

  it("names ✓ (M1-plugged-in, K15): three things, seven operations (ST1.02), the refusals' exits, the CLI named plugged-in", () => {
    expect(Object.keys(p.m.things).sort()).toEqual(["handle", "link", "profile"]);
    expect(Object.keys(p.m.operations).sort()).toEqual(["handle.claim", "handle.release", "handle.resolve", "link.add", "link.order", "link.remove", "profile.get"]);
    const exit = (thing: string, error: string) => (error in p.m.things[thing]!.errors ? p.m.things[thing]!.errors[error]!.exit : p.m.things[thing]!.machine?.notFrom.exit);
    expect([exit("handle", "HandleTaken"), exit("handle", p.m.things["handle"]!.machine!.notFrom.error), exit("handle", "HandleAlreadyOwned"), exit("handle", "HandleNotFound"), exit("profile", "ProfileNotFound"), exit("link", "LinkNeedsHandle"), exit("link", p.m.things["link"]!.machine!.notFrom.error), exit("link", "LinkAlreadyRemoved")]).toEqual([10, 11, 12, 13, 20, 30, 31, 32]);
    expect(JSON.parse(textAt(p.root, "package.json")).bin).toHaveProperty("plugged-in");
    expect(textAt(p.root, "generated/cli/src/main.ts")).toContain("PLUGGED_IN_URL");
  });

  it("operation and read x SDK, CLI, MCP, portal ✓: each of the seven is in all four, as the model has it", () => {
    expect([L.sdkMissing(p.root, p.m), L.cliMissing(p.root, p.m), L.mcpMissing(p.root, p.m), L.portalOperationDiffs(p.portal, p.m)]).toEqual([[], [], [], []]);
  });
  it("machine x portal ✓: each machine's states and moves are in the portal's data file", () => {
    expect(L.things(p.m).filter((t) => t.machine).map((t) => t.name).sort()).toEqual(["handle", "link"]);
    expect(L.portalMachineDiffs(p.portal, p.m)).toEqual([]);
  });
  it("thing x portal ✓: each thing's description is in the portal's data file, and in the docs", () => {
    expect(L.portalThingDescriptionDiffs(p.portal, p.m)).toEqual([]);
  });
  it("thing and fields x SDK ~: the SDK exports each thing's type and the type of each of its fields (M1.42)", () => {
    const types = L.sdkTypesMissing(p.root, p.m);
    expect(types.failure, types.out).toBeUndefined();
    expect(types.checked).toBeGreaterThan(5);
    expect(types.missing.filter((label) => label.startsWith("type ") || label.includes("[")), types.out).toEqual([]);
  });
  it("thing and fields x CLI ~: a number is a number flag, and a flag's help is its field's description (M1.42)", () => {
    expect(L.cliUntyped(p.root, p.m)).toEqual([]);
    expect(L.cliHelpProblems(p.root, p.m)).toEqual([]);
  });
  it("thing and fields x MCP ~: each input property carries its field's description (M1.42)", () => {
    expect(L.mcpUndescribed(p.root, p.m)).toEqual([]);
  });
  it("thing and fields x portal ~: each field's description and visibility are in the portal's data file (M1.42)", () => {
    expect(L.portalFieldDiffs(p.portal, p.m)).toEqual([]);
  });
  it("step x SDK, CLI, MCP ✗ by design: no client output names a step", () => {
    expect(L.operations(p.m).flatMap((op) => Object.values(op.steps)).length).toBeGreaterThan(5);
    expect(L.stepsInClients(p.root, p.m)).toEqual([]);
  });
  it("step x portal ~: every detail of a step (`optional`, `writes`, its call), not only name and type (M1.42)", () => {
    expect(L.portalStepDiffs(p.portal, p.m)).toEqual([]);
  });
  it("event x API ✓, SDK ✗: the server speaks each event, and the SDK exports its type (M1.42)", () => {
    expect(L.things(p.m).flatMap((t) => Object.keys(t.events)).sort()).toEqual(["HandleClaimed", "HandleReleased", "LinkAdded", "LinkRemoved"]);
    expect(L.apiDiffs(p.root, p.m).filter((d) => d.startsWith("API events"))).toEqual([]);
    const types = L.sdkTypesMissing(p.root, p.m);
    expect(types.failure, types.out).toBeUndefined();
    expect(types.missing.filter((label) => label.startsWith("event "))).toEqual([]);
  });
  it("event x portal ~: each event with the fields it carries is in the portal's data file (M1.42)", () => {
    expect(L.portalEventDiffs(p.portal, p.m)).toEqual([]);
  });
  it("error and code x API, SDK ✓: each error is a class with its code and its exit; the machine's refusals too", () => {
    expect(L.things(p.m).flatMap((t) => Object.keys(t.errors)).length).toBeGreaterThanOrEqual(4);
    expect(L.apiDiffs(p.root, p.m).filter((d) => d.startsWith("API errors"))).toEqual([]);
  });
  it("error and code x portal ~: each error with its code and exit, and the machine's refusal with its code (M1.42)", () => {
    expect(L.portalErrorDiffs(p.portal, p.m)).toEqual([]);
  });
});

// ---- the loop, on workerd ----

describe("20 K13 grid: the loop, through the SDK and the CLI", () => {
  let p: Project;
  let loop: W.Loop;
  let ran: Awaited<ReturnType<typeof story>>;
  beforeAll(async () => {
    p = make(L.requireExample());
    cleanup.push(() => { p.remove(); nothingRunning(p.root); });
    loop = await W.openLoop(p.root);
    cleanup.push(() => loop.close());
    ran = await story(p, loop);
  });

  it("operation x telemetry ✓ (control): the world answers and every call opens its operation span", async () => {
    const first = W.tracesOf(loop, "/handle/claim")[0];
    expect(first, "the proxy saw a claim").toBeDefined();
    const spans = await W.until(() => loop.spans(first!), (s) => W.named(s, "handle.claim") !== undefined);
    expect(W.named(spans, "handle.claim")?.attrs).toMatchObject({ operation: "handle.claim" });
  });

  for (const client of ["sdk", "cli"] as const) {
    it(`operation and read x ${client.toUpperCase()} ✓: each is called once and answers what the model says it answers (M1.43)`, () => {
      const got = ran.calls.filter((c) => c.client === client);
      expect([...new Set(got.map((c) => c.op))].sort()).toEqual(Object.keys(p.m.operations).sort());
      expect(got.filter((c) => !c.result.ok).map((c) => `${c.op}: ${c.result.stderr ?? c.result.raw}`.slice(0, 300))).toEqual([]);
      expect(got.map((c) => [c.op, Object.keys(c.result.answer).sort()])).toEqual(got.map((c) => [c.op, Object.keys(p.m.operations[c.op]!.answer).sort()]));
    });
  }

  it("thing x read ✓: the page lists its links in the order they were given, and a removed one is gone (M1.43)", () => {
    expect(ran.pages).toEqual(ran.wanted);
  });

  it("error and code x CLI ~: the refused claim prints its code and exits 10, as the model says (M1.43)", () => {
    const taken = p.m.things["handle"]!.errors["HandleTaken"]!;
    expect(taken.exit, "M1-plugged-in.md fixes it").toBe(10);
    expect([ran.refusedCli.exit, ran.refusedCli.stderr?.includes(`[${taken.code}] HandleTaken`)], ran.refusedCli.stderr).toEqual([taken.exit, true]);
  });
  it("error and code x SDK ✓: the refused claim is a typed failure `HandleTaken` carrying the model's code (M1.43)", () => {
    expect([ran.refusedSdk.tag, ran.refusedSdk.code], ran.refusedSdk.raw).toEqual(["HandleTaken", p.m.things["handle"]!.errors["HandleTaken"]!.code]);
  });

  it("event x telemetry ✗ (M1.36, M1.43): the commit span carries the event the model says the move emits", async () => {
    const claim = p.m.operations["handle.claim"]!;
    const trace = W.tracesOf(loop, "/handle/claim")[0]!;
    const spans = await W.until(() => loop.spans(trace), (s) => W.named(s, "handle.claim.commit") !== undefined);
    expect(W.named(spans, "handle.claim.commit")?.attrs).toMatchObject({ "event.name": claim.move!.emits });
    const journal = await loop.journal(trace);
    expect(journal.map((e) => e.event), "the event is in the journal").toContain(claim.move!.emits);
  });
  it("error and code x telemetry ~ (M1.36, M1.43): the refused call's span carries the refusal and its code, and commits nothing", async () => {
    const taken = p.m.things["handle"]!.errors["HandleTaken"]!;
    const trace = W.tracesOf(loop, "/handle/claim")[2]!;
    const spans = await W.until(() => loop.spans(trace), (s) => W.named(s, "handle.claim") !== undefined);
    expect(W.named(spans, "handle.claim")?.attrs).toMatchObject({ refusal: "HandleTaken", "refusal.code": taken.code });
    expect(W.named(spans, "handle.claim.commit")).toBeUndefined();
  });
  it("step x telemetry ✓: each step of the model is a span of the call (M1.43)", async () => {
    const claim = p.m.operations["handle.claim"]!;
    const trace = W.tracesOf(loop, "/handle/claim")[0]!;
    const spans = await W.until(() => loop.spans(trace), (s) => Object.values(claim.steps).every((st) => W.named(s, st.name) !== undefined));
    expect(Object.values(claim.steps).map((st) => [st.name, W.named(spans, st.name) !== undefined])).toEqual(Object.values(claim.steps).map((st) => [st.name, true]));
  });
});

// ---- the story: both clients, every operation, then two refusals ----

// Stage 1 (ST1.02): `handle.claim` and `link.add` are `signedIn`, and `link.order`, `link.remove` and `handle.release` are
// the owner's, so each client's story is told by its own signed-in test person: a token from the world's `/_world/cast`
// (the SDK takes it as `Sdk.layer(url, token)`, the CLI as `PLUGGED_IN_TOKEN`). `handle.resolve` and `profile.get` are
// public and are read as a visitor. One person holds one name, so each refusal is a third person claiming a name that is
// taken. The release comes last: a released name is free again, and the refusals need it held.
const story = async (p: Project, loop: W.Loop) => {
  const op = (name: string) => p.m.operations[name]!;
  const calls: Array<{ client: "sdk" | "cli"; op: string; result: W.Result }> = [];
  const wanted: Array<ReadonlyArray<string>> = [];
  const pages: Array<ReadonlyArray<string>> = [];
  const tag = () => Math.random().toString(16).slice(2, 8);
  const handles = { sdk: `sdk${tag()}`, cli: `cli${tag()}` };
  const people = await loop.cast(["sdkOwner", "cliOwner", "sdkTaker", "cliTaker"]);
  const call = async (client: "sdk" | "cli", name: string, ctx: W.Context): Promise<W.Result> => {
    let result: W.Result;
    try { result = client === "sdk" ? await W.viaSdk(p.root, loop, op(name), ctx, `${client}-${calls.length}`) : await W.viaCli(p.root, loop, op(name), ctx); }
    catch (error) { result = { ok: false, answer: {}, stderr: String(error), raw: "" }; }
    if (result.ok) W.learn(op(name), result.answer, ctx.ids);
    calls.push({ client, op: name, result });
    return result;
  };
  const visitor = ({ token: _token, ...rest }: W.Context): W.Context => rest;
  const owners = {} as Record<"sdk" | "cli", W.Context>;
  for (const client of ["sdk", "cli"] as const) {
    const ctx = { handle: handles[client], ids: {} as Record<string, string>, title: "Alpha", url: "https://example.com/alpha", position: "0", token: people[`${client}Owner`] ?? "" };
    owners[client] = ctx;
    await call(client, "handle.claim", ctx);
    await call(client, "handle.resolve", visitor(ctx));
    await call(client, "link.add", ctx);
    const alpha = ctx.ids["link.id"];
    await call(client, "link.add", { ...ctx, title: "Beta", url: "https://example.com/beta" });
    const beta = ctx.ids["link.id"];
    if (beta !== undefined) await call(client, "link.order", { ...ctx, position: "0" });
    const page = async () => ((await call(client, "profile.get", visitor(ctx))).answer["links"] as ReadonlyArray<{ id: string }> | undefined ?? []).map((l) => l.id);
    pages.push(await page());
    wanted.push([beta ?? "?", alpha ?? "?"]);
    if (alpha !== undefined) ctx.ids["link.id"] = alpha;
    await call(client, "link.remove", ctx);
    pages.push(await page());
    wanted.push([beta ?? "?"]);
  }
  const taken = (client: "sdk" | "cli", name: string) => call(client, "handle.claim", { handle: name, ids: {}, title: "", url: "", position: "0", token: people[`${client}Taker`] ?? "" });
  const refusedCli = await taken("cli", handles.sdk);
  const refusedSdk = await taken("sdk", handles.cli);
  for (const client of ["sdk", "cli"] as const) await call(client, "handle.release", owners[client]);
  const refused = new Set<W.Result>([refusedCli, refusedSdk]);
  return { calls: calls.filter((c) => !refused.has(c.result)), pages, wanted, refusedCli, refusedSdk };
};
