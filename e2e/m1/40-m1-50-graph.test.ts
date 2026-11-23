// Check 40 (M1.50): one `Graph` for the machines, the blueprint map and the worlds. The done-when, clause by clause:
//   A  "Plugged In's portal draws its map, both machines and the worlds chain with no position written by hand"
//   B  "two generations give byte-identical layouts"
//   C  "a journey's run lights its path on the machine and no state shows a count"
//   D  "the portal bundle holds no elk"
// and the row's own words: over `@xyflow/react` in `@orthograph/portal-ui`, laid out by `elkjs` in the generator, our components as the nodes, views from the model.
//
// THE CONTRACT (the checks author's reading of the row and `spikes/react-flow-graphs`, README "Found"; the builder meets it here):
//  1. DATA. `generated/portal/blueprint.json` gains a top-level `graphs: { map, worlds, machines: { <thing>: Laid } }`, a machine for each thing that has one
//     and none for one that has none. `Laid`, `Placed` and `Route` are in `graph-expect.ts`: x, y relative to the parent, edge points in the graph's own
//     coordinates, nodes told apart by kind and label (a group's label is `app` or the mount's name; a state's is its name; a thing's, a world's and a journey's
//     are theirs; an entry node is kind `start`). What each graph holds is read out of the model there, and nothing else is drawn: the map has the things in their
//     app or plugin, `ref` edges (fields, one per pair, labelled with the fields), `payload` edges (`<op> { <field> }`), `mounts` and `needs` edges between groups, and
//     no `on` edge until the model carries `handlers` (M3.08); a machine has its states, an entry, and a `move` edge per move (label the move's key, note naming the
//     event); the worlds have the empty world, each starting world and each journey, `from` edges along the chain and `starts` edges for the journeys.
//  2. POSITIONS COME FROM THE GENERATOR: `elkjs` is a pinned dependency of `packages/generators` and of nothing else, imported nowhere but there; `@xyflow/react` is
//     portal-ui's and nowhere else's; the built client holds no elk. `Wire`'s schema keeps `graphs`. Two generations, in two folders, write the same bytes.
//     DIRECTION: the layered layouts (a machine, the worlds) run left to right, elk's `RIGHT`: the entry node is the left-most node of its graph, and an edge runs
//     from the left to the right (`geometryProblems` reads this as "nothing lies left of the entry"). The map has no entry and no direction pinned.
//     DOOR REFUSALS: a journey's refusal marks no move when it was made at the door: `NotAllowed`, `InvalidPayload` and `IdempotencyConflict` (`graph-light.ts` says
//     where each is named); `<Thing>NotFound` is not one of them, so it marks the move it was made at.
//  3. THE PAGES (hooks in `graph-page.ts`): `/portal/map`, `/portal/worlds`, and a thing's page holding its machine's graph inside `lifecycle` (checks 21 and 28 keep
//     reading `lifecycle`). Nodes are our components, drawn where the data puts them; `?lighting=structure|live|trace` picks the lighting (default live when the
//     portal has `live`), `&journey=<file name>` the trace's journey. Lighting never moves a node. Rules for each lighting are in `graph-light.ts`.
//
// WHAT RUNS WHERE (as check 28): the generator-side and seam assertions run anywhere (`pnpm exec vitest run --root e2e --config vitest.m1.config.ts m1/40`). The pages
// of the real portal need its client, which needs HeroUI Pro, so `@orthograph/portal` builds it in CI only (`packages/portal/dist/client`): the "portal draws them" and
// "bundle" groups can only go green there, and until it is built they fail here with a message that says so. The controls prove the judges against a stand-in client.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Wire } from "@orthograph/portal";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import type { ServedPortal } from "../served-portal/types.ts";
import { graphProblems, machineSpec, type GraphModel, machineThings, mapSpec, structureProblems, worldsSpec, type Graphs } from "./graph-expect.ts";
import { fakeGraphs, withNeeds } from "./graph-fake.ts";
import { liveContext, liveFixture, traceOf, withRefusal } from "./graph-light.ts";
import { scan } from "./graph-page.ts";
import { LAID } from "./graph-plants.ts";
import { PAGE } from "./graph-page-plants.ts";
import { run, standIn, standInServer } from "./graph-standin.ts";
import { committed, generateAcme, generateChained, generatePluggedIn, generateWithNeeds, generateWithPlugin, type Generated, type PortalData } from "./graph-project.ts";
import { allVisits, placesOf, plainVisit, visitProblems } from "./graph-routes.ts";
import { elkDeclaration, elkInside, filesUnder, flowDeclaration, importProblems, importing, lockHas, manifests, sourcesUnder, type Manifest } from "./graph-seam.ts";
import { textFiles } from "./portal-seam.ts";
import { repo, succeeds, textAt } from "./support.ts";

afterAll(async () => { await ServedPortals.closeAll(); });
const dist = join(repo, "packages/portal/dist/client");
const decode = (json: unknown) => Effect.runPromise(Wire.decode(json));
const said = (found: ReadonlyArray<string>) => found.join("\n");

// ---- A and B: what `ortho generate` writes (anywhere) ----

describe("40 M1.50: the generator writes the portal's graphs", () => {
  const made: Array<Generated> = [];
  const gen = new Map<string, Generated>();
  const once = (name: string, make: () => Generated): Generated => { const hit = gen.get(name) ?? make(); gen.set(name, hit); if (!made.includes(hit)) made.push(hit); return hit; };
  afterAll(() => { for (const g of made) g.remove(); });
  beforeAll(() => { once("plugged", generatePluggedIn); }, 600_000);

  it("A: Plugged In's data holds its map, both machines and the worlds chain, each the model's own and a real picture: sizes, nothing overlapping, children in their group, routes from source to target", { timeout: 600_000 }, () => {
    const { wire } = once("plugged", generatePluggedIn);
    expect(Object.keys(wire.model.things).sort(), "Plugged In's things").toEqual(["handle", "link", "profile"]);
    expect(machineThings(wire.model), "handle and link have a machine, profile has none").toEqual(["handle", "link"]);
    expect(graphProblems(wire.graphs, wire.model), said(graphProblems(wire.graphs, wire.model))).toEqual([]);
  });

  it("A: the same for acme, whose starting worlds chain (funded and invited begin from founded) and whose things have more states", { timeout: 600_000 }, () => {
    const { wire } = once("acme", generateAcme);
    expect(Object.values(wire.model.startingWorlds).filter((w) => w.from !== null).length, "acme chains two worlds").toBeGreaterThanOrEqual(2);
    expect(graphProblems(wire.graphs, wire.model), said(graphProblems(wire.graphs, wire.model))).toEqual([]);
  });

  it("A: a plugin's things sit in a group of their own, and the app mounts it: acme with a plugin mounted draws the echo thing in the `echo` group, with a `mounts` edge", { timeout: 600_000 }, () => {
    const { wire } = once("plugin", generateWithPlugin);
    expect(wire.model.things["echo"]!.from.kind, "the thing comes from a feature").toBe("feature");
    expect(structureProblems("map", wire.graphs?.map, mapSpec(wire.model)), "the map of acme with a plugin").toEqual([]);
    expect(mapSpec(wire.model).nodes.some((n) => n.key === "group:echo") && mapSpec(wire.model).edges.some((e) => e.kind === "mounts"), "the model's plugin group").toBe(true);
    expect(graphProblems(wire.graphs, wire.model), said(graphProblems(wire.graphs, wire.model))).toEqual([]);
  });

  it("A: a plugin that needs another is drawn needing it: echo and greet mounted (greet's mount records `needs: [\"feature:echo\"]`) draw a `needs` edge from the greet group to the echo group, and no other", { timeout: 600_000 }, () => {
    const { wire } = once("needs", generateWithNeeds);
    expect(wire.model.mounts?.["greet"]?.needs, "the model records the need as check 06 reads it").toEqual(["feature:echo"]);
    const needs = mapSpec(wire.model).edges.filter((e) => e.kind === "needs");
    expect(needs.map((e) => `${e.from}>${e.to}`), "the model's needs").toEqual(["group:greet>group:echo"]);
    expect(structureProblems("map", wire.graphs?.map, mapSpec(wire.model)), "the map of acme with echo and greet").toEqual([]);
    expect(graphProblems(wire.graphs, wire.model), said(graphProblems(wire.graphs, wire.model))).toEqual([]);
  });

  it("A: a changed model gives a changed, valid picture: one starting world moved onto another adds a `from` edge from it, and the worlds are laid out again", { timeout: 600_000 }, () => {
    const base = once("plugged", generatePluggedIn).wire;
    const { wire } = once("chained", generateChained);
    const chain = worldsSpec(wire.model).edges.find((e) => e.kind === "from" && e.to === "world:page-with-links");
    expect(chain?.from, "the model chains the world").toBe("world:claimed");
    expect(graphProblems(wire.graphs, wire.model), said(graphProblems(wire.graphs, wire.model))).toEqual([]);
    expect(JSON.stringify(wire.graphs?.worlds.nodes.map((n) => [n.label, n.x, n.y])), "a different chain gives a different layout").not.toEqual(JSON.stringify(base.graphs?.worlds.nodes.map((n) => [n.label, n.x, n.y])));
    expect(wire.graphs?.machines, "and the machines, which did not change, are laid out as they were").toEqual(base.graphs?.machines);
  });

  it("B: two generations, in two folders, write byte-identical portal data (so identical layouts); a third over the same folder changes nothing", { timeout: 600_000 }, () => {
    const a = once("plugged", generatePluggedIn);
    const b = once("again", generatePluggedIn);
    expect(a.root, "two folders").not.toBe(b.root);
    expect(a.wire.graphs, "the data has layouts to compare").toBeDefined();
    expect(b.wire.graphs).toEqual(a.wire.graphs);
    expect(b.text, "the whole file, byte for byte").toEqual(a.text);
    succeeds(a.root, "generate");
    expect(textAt(a.root, "generated/portal/blueprint.json"), "a second generation over the same folder").toEqual(a.text);
  });

  it("B: Plugged In's committed portal data is what `ortho generate` writes, layouts included", { timeout: 600_000 }, () => {
    const fresh = once("plugged", generatePluggedIn).wire;
    expect(committed().graphs, "regenerate examples/plugged-in and commit generated/portal/blueprint.json").toEqual(fresh.graphs);
    expect(committed().graphs).toBeDefined();
  });

  it("the portal's `Wire` keeps `graphs` when it decodes the data (it drops what its schema does not name)", { timeout: 600_000 }, async () => {
    const { wire } = once("plugged", generatePluggedIn);
    const decoded = (await decode(wire)) as unknown as { graphs?: Graphs };
    expect(decoded.graphs, "Wire.decode(blueprint.json).graphs").toBeDefined();
    expect(decoded.graphs, "what Wire decodes is what the file holds, node for node and edge for edge").toEqual(wire.graphs);
  });
});

// ---- the seam: who declares and imports what (anywhere) ----

describe("40 M1.50: elk stays in the generator, React Flow in portal-ui", () => {
  const all = manifests();
  it("`elkjs` is a pinned dependency of packages/generators and declared nowhere else", () => { expect(elkDeclaration(all), said(elkDeclaration(all))).toEqual([]); });
  it("`@xyflow/react` is portal-ui's, pinned where it is installed, and declared nowhere else", () => { expect(flowDeclaration(all), said(flowDeclaration(all))).toEqual([]); });
  it("the lockfile resolves both at the versions the packages pin", () => {
    const lock = readFileSync(join(repo, "pnpm-lock.yaml"), "utf8");
    const pins = (pkg: string, name: string) => (all[pkg]?.dependencies?.[name] ?? all[pkg]?.devDependencies?.[name]) ?? "none";
    expect(lockHas(lock, "elkjs", pins("packages/generators/package.json", "elkjs")), "pnpm-lock.yaml resolves elkjs at generators' pin").toBe(true);
    expect(lockHas(lock, "@xyflow/react", pins("packages/portal-ui/package.json", "@xyflow/react")), "pnpm-lock.yaml resolves @xyflow/react at portal-ui's pin").toBe(true);
  });
  it("`elkjs` is imported in packages/generators and nowhere else (never the portal, portal-ui, the front door, generated code or the blueprint); `@xyflow/react` in portal-ui only", () => {
    const sources = sourcesUnder(["packages", "examples/plugged-in/src", "examples/plugged-in/blueprint", "examples/plugged-in/generated", "examples/acme/src", "examples/acme/blueprint", "examples/acme/generated", "docs/canon"]);
    expect(importProblems(sources), said(importProblems(sources))).toEqual([]);
  });
  it("`@orthograph/portal-ui` exports `Graph`", () => {
    const index = sourcesUnder(["packages/portal-ui/src"])["packages/portal-ui/src/index.ts"] ?? "";
    expect(/export\s*\{[^}]*\bGraph\b[^}]*\}/.test(index), "packages/portal-ui/src/index.ts exports `Graph`").toBe(true);
  });
  it("D: the portal's built client draws with React Flow and holds no elk: no package name, no Java name, no option id (CI only: the client is built there with HeroUI Pro)", () => {
    expect(existsSync(join(dist, "index.html")), `${dist}/index.html is missing: \`@orthograph/portal\` builds its client once, with the licence, in CI`).toBe(true);
    const files = filesUnder(dist);
    expect(Object.keys(files).some((p) => p.endsWith(".js")), "the built client has script").toBe(true);
    expect(Object.keys(files).some((p) => /\.(js|mjs)$/.test(p) && /react-flow|@xyflow/.test(files[p]!)), "the client carries React Flow (the Graph ships)").toBe(true);
    expect(elkInside(files), "elk in the built client").toEqual([]);
  });
});

// ---- the real portal draws them (CI: the client is built there) ----

describe("40 M1.50: the portal draws the graphs, where the data puts them, lit as the model and the run say", () => {
  let served: ServedPortal | undefined;
  let data: Generated | undefined;
  const live = liveFixture(committed().model);
  const opened = async (): Promise<{ portal: ServedPortal; graphs: Graphs | undefined }> => {
    data ??= generatePluggedIn();
    served ??= await ServedPortals.open({ context: liveContext(await decode(data.wire), live) });
    return { portal: served, graphs: data.wire.graphs };
  };
  afterAll(() => { data?.remove(); });
  const model = committed().model;
  const group = (label: string, pick: (v: ReturnType<typeof allVisits>[number]) => boolean) => it(label, { timeout: 600_000 }, async () => {
    const { portal, graphs } = await opened();
    const found: Array<string> = [];
    for (const visit of allVisits(model, live).filter(pick)) found.push(...await visitProblems(portal, graphs, visit));
    expect(found, said(found)).toEqual([]);
  });

  group("A: `/portal/map` draws the blueprint map: the things in the app, their refs and payload refs, in the data's own positions", (v) => v.view === "map");
  group("A: `/portal/worlds` draws the worlds' `from` chain with the journeys on each", (v) => v.view === "worlds");
  group("A: a thing with a machine draws it in its `lifecycle`, structure only: no move lit, no count; a thing with none draws no graph", (v) => v.view === "thing" && (v.lighting?.mode === "structure" || v.lighting === undefined));
  group("C: live: each move carries the moves committed in the window (an attempt carrying `move.name`, never a refused one or one before the window), and no state shows a count", (v) => v.view === "thing" && v.lighting?.mode === "live" && v.route.includes("lighting=live"));
  group("C: a journey's run lights its path: for each journey and each machine, the steps a move was made at and the refusals it met, door refusals marking nothing", (v) => v.view === "thing" && v.lighting?.mode === "trace");
  it("C: a thing's page opens in live lighting when the portal has `live`, and lighting never moves a node", { timeout: 600_000 }, async () => {
    const { portal, graphs } = await opened();
    for (const t of machineThings(model)) {
      expect(await visitProblems(portal, graphs, plainVisit(t, live)), `/portal/things/${t}`).toEqual([]);
      const base = await placesOf(portal, `/portal/things/${t}?lighting=structure`);
      expect(base.length, `${t} draws its nodes`).toBeGreaterThan(0);
      expect(await placesOf(portal, `/portal/things/${t}?lighting=live`), `${t}: live`).toEqual(base);
      for (const j of Object.keys(model.journeys)) expect(await placesOf(portal, `/portal/things/${t}?lighting=trace&journey=${j.split("/").pop()!.replace(/\.ts$/, "")}`), `${t}: trace of ${j}`).toEqual(base);
    }
  });
  it("A: the portal draws what the data says, not what it would lay out itself: two nodes of a machine with their positions swapped in the data are drawn swapped", { timeout: 600_000 }, async () => {
    const { graphs } = await opened();
    const planted = structuredClone(graphs) as Graphs;
    const states = planted.machines["handle"]!.nodes.filter((n) => n.kind === "state") as Array<{ x: number; y: number }>;
    const [a, b] = states as [{ x: number; y: number }, { x: number; y: number }];
    [a.x, b.x, a.y, b.y] = [b.x, a.x, b.y, a.y];
    // The digest is over the whole document, graphs included: a data file changed by hand is refused, so the planted one is signed again.
    const { digest: _, ...rest } = { ...(data!.wire), graphs: planted } as Record<string, unknown>;
    const wire = { ...rest, digest: Wire.digestOf(rest) };
    const portal = await ServedPortals.open({ context: liveContext(await decode(wire), live) });
    try { expect(await visitProblems(portal, planted, plainVisit("handle", live))).toEqual([]); } finally { await portal.close(); }
  });
});

// ---- the instruments, proved (all pass anywhere) ----

describe("40 control: the oracle and the lighting rules are read out of the model", () => {
  const wire = committed();
  const m = wire.model;
  it("Plugged In's expected graphs: one app group of three things, four edges between them, handle and link's machines, five worlds and seven journeys on them", () => {
    const map = mapSpec(m);
    expect(map.nodes.map((n) => n.key).sort()).toEqual(["group:app", "thing:handle", "thing:link", "thing:profile"]);
    expect(map.edges.map((e) => `${e.kind}|${e.from}|${e.to}|${String(e.label)}`).sort()).toEqual([
      "payload|thing:profile|thing:handle|profile.get { handle }", "ref|thing:link|thing:handle|owner", "ref|thing:link|thing:profile|profile", "ref|thing:profile|thing:handle|handle"]);
    expect(machineSpec(m, "handle").edges.map((e) => `${e.from}>${e.to}:${String(e.label)}:${String(e.noteHas)}`)).toEqual(["start>state:claimed:claim:HandleClaimed", "state:claimed>state:released:release:HandleReleased"]);
    expect(machineThings(m)).toEqual(["handle", "link"]);
    const worlds = worldsSpec(m);
    expect(worlds.nodes.filter((n) => n.kind === "world")).toHaveLength(5);
    expect(worlds.nodes.filter((n) => n.kind === "journey")).toHaveLength(7);
    expect(worlds.edges.filter((e) => e.kind === "from").every((e) => e.from === "start"), "Plugged In's worlds begin from nothing").toBe(true);
  });
  it("a trace is read from a journey's steps: add moved at step 2, remove at 8 and refused `link.notFrom` at 10; a stranger's refusals at the door mark nothing and add is turned back", () => {
    const edit = traceOf(m, "link", "journeys/add-order-and-remove-a-link.ts");
    expect(edit["add"]).toEqual({ moved: [2], refused: [] });
    expect(edit["remove"]!.moved).toEqual([8]);
    expect(edit["remove"]!.refused[0]).toBe("10:link.notFrom");
    expect(traceOf(m, "link", "journeys/a-stranger-cannot-edit-a-page.ts")).toEqual({ add: { moved: [], refused: ["1:LinkNeedsHandle"] }, remove: { moved: [], refused: [] } });
    expect(traceOf(m, "handle", "journeys/the-story.ts")).toEqual({ claim: { moved: [1], refused: [] }, release: { moved: [], refused: [] } });
  });
  it("the live fixture counts what the window holds: claim 0, release 1, add 2, remove 0, with a move before the window and a refused attempt in it for each", () => {
    expect(liveFixture(m).counts).toEqual({ "handle.claim": 0, "handle.release": 1, "link.add": 2, "link.remove": 0 });
    expect(liveFixture(m).traces.size, "3 moves in the window, and for each of the 4 operations one before it and one refused").toBe(3 + 4 * 2);
  });
});

// ---- the judges, proved on a stand-in (pass anywhere with Playwright's Chromium) ----

const acmeWire = () => JSON.parse(readFileSync(join(repo, "examples/acme/generated/portal/blueprint.json"), "utf8")) as PortalData;
const acmeModel = () => acmeWire().model;
describe("40 control: the geometry and structure judge names each wrong graph and accepts a right one", () => {
  it("a correct generator's graphs (the stand-in's plain layout) pass for Plugged In and for acme", () => {
    for (const m of [committed().model, acmeModel()]) expect(graphProblems(fakeGraphs(m), m), said(graphProblems(fakeGraphs(m), m))).toEqual([]);
  });
  it("a plugin that needs another is expected to be drawn needing it: `feature:echo` is the group `echo`, one `needs` edge from greet, none from echo or extra, and the stand-in's picture of it passes", () => {
    const n = withNeeds(committed().model);
    expect(mapSpec(n).edges.filter((e) => e.kind === "needs").map((e) => `${e.from}>${e.to}:${String(e.label)}`)).toEqual(["group:greet>group:echo:needs"]);
    expect(mapSpec(n).edges.filter((e) => e.kind === "mounts").map((e) => e.to).sort(), "each plugin is mounted by the app").toEqual(["group:echo", "group:extra", "group:greet"]);
    expect(graphProblems(fakeGraphs(n), n), said(graphProblems(fakeGraphs(n), n))).toEqual([]);
    const needing = (...needs: ReadonlyArray<string>): GraphModel => ({ ...n, mounts: { ...n.mounts, greet: { kind: "feature", needs } } });
    expect(mapSpec(needing("echo")).edges.filter((e) => e.kind === "needs"), "a need with no kind in front of it is read by its name too").toHaveLength(1);
    expect(mapSpec(needing("feature:nothing-mounted")).edges.filter((e) => e.kind === "needs"), "a need on a mount that holds no thing has no group to join").toEqual([]);
  });
  it("labels that list a ref's fields in another order, and a group, edge or machine in another order, are the same graph", () => {
    const m = committed().model, g = structuredClone(fakeGraphs(acmeModel())) as Graphs;
    const acme = acmeModel();
    const invited = g.map.edges.find((e) => e.kind === "ref" && (e.label ?? "").includes(","))!;
    (invited as { label?: string }).label = (invited.label ?? "").split(", ").reverse().join(", ");
    (g.map as { nodes: unknown }).nodes = [...g.map.nodes].reverse();
    (g.map as { edges: unknown }).edges = [...g.map.edges].reverse();
    expect(graphProblems(g, acme), said(graphProblems(g, acme))).toEqual([]);
    expect(m).toBeDefined();
  });
  it.each(LAID)("$name", (p) => {
    const m = p.model === "acme" ? acmeModel() : p.model === "needs" ? withNeeds(committed().model) : committed().model;
    const g = structuredClone(fakeGraphs(m)) as Graphs;
    p.plant(g);
    const found = graphProblems(g, m);
    expect(found.some((f) => f.includes(p.says)), `expected "${p.says}" in:\n${said(found)}`).toBe(true);
  });
});

const dirs: Array<string> = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const clientWith = (changes: ReadonlyArray<readonly [string, string]>): string => {
  const dir = mkdtempSync(join(tmpdir(), "graph-standin-"));
  dirs.push(dir);
  let html = standIn();
  for (const [from, to] of changes) {
    if (!html.includes(from)) throw new Error(`the stand-in has no ${from}: the control is out of date`);
    html = html.replace(from, to);
  }
  writeFileSync(join(dir, "index.html"), html);
  return dir;
};
const stand = (graphs: Graphs, counts: unknown, changes: ReadonlyArray<readonly [string, string]> = [], model: GraphModel = committed().model) =>
  ServedPortals.open({ context: { blueprint: { ...committed(), model, graphs }, counts }, clientDir: clientWith(changes), server: standInServer, run });
/** A journey of Plugged In that ends with a call of `link.add` answered by `InvalidPayload`: nothing in the examples refuses that, so the door's list is proved on it. */
const STRANGER_FILE = "journeys/a-stranger-cannot-edit-a-page.ts";
const refusedBy = (error: string) => withRefusal(committed().model, Object.keys(committed().model.journeys).find((j) => j.endsWith(STRANGER_FILE))!, "link.add", error);

describe("40 control: the page judge accepts a portal drawn from the data and names each wrong one", () => {
  const m = committed().model, graphs = fakeGraphs(m), live = liveFixture(m);
  it("the stand-in client, drawn from the data, passes every page: the map, the worlds, each machine under each lighting and each journey's trace, and a thing with no machine", { timeout: 300_000 }, async () => {
    const portal = await stand(graphs, live.counts);
    try {
      const found: Array<string> = [];
      for (const visit of allVisits(m, live)) found.push(...await visitProblems(portal, graphs, visit));
      expect(found, said(found)).toEqual([]);
    } finally { await portal.close(); }
  });
  it("a portal with no `live` opens a thing's page in structure lighting, and the stand-in passes acme's machines too", { timeout: 300_000 }, async () => {
    const portal = await stand(graphs, null);
    try { expect(await visitProblems(portal, graphs, plainVisit("link", undefined))).toEqual([]); } finally { await portal.close(); }
    const am = acmeModel(), ag = fakeGraphs(am), al = liveFixture(am);
    const acmePortal = await ServedPortals.open({ context: { blueprint: { ...acmeWire(), graphs: ag }, counts: al.counts }, clientDir: clientWith([]), server: standInServer, run });
    try {
      const found: Array<string> = [];
      for (const visit of allVisits(am, al).filter((v) => v.view !== "thing" || !v.route.includes("lighting=trace"))) found.push(...await visitProblems(acmePortal, ag, visit));
      expect(found, said(found)).toEqual([]);
    } finally { await acmePortal.close(); }
  });
  it("the stand-in draws each edge as SVG, which has no `innerText`, and the judge reads it: every edge has a visible line and says its label (the control for a real React Flow's edges)", { timeout: 120_000 }, async () => {
    const portal = await stand(graphs, live.counts);
    try {
      for (const route of ["/portal/map", "/portal/worlds", "/portal/things/link?lighting=structure"]) {
        const seen = (await scan(portal, route)).graphs[0]!;
        expect(seen.edges.length, `${route} draws edges`).toBeGreaterThan(0);
        for (const e of seen.edges) expect(e.line.shown, `${route}: edge ${String(e.edge)} has a line`).toBe(1);
        if (route !== "/portal/worlds") expect(seen.edges.some((e) => e.text !== ""), `${route}: an SVG edge's label is read from its text nodes (the worlds' edges have none)`).toBe(true);
      }
    } finally { await portal.close(); }
  });
  it("a refusal of `InvalidPayload` on a move marks nothing, as one at the door: the stand-in passes a journey that ends with one, and `HandleNotFound` (not a door) marks the move refused", { timeout: 120_000 }, async () => {
    const m2 = refusedBy("InvalidPayload"), g2 = fakeGraphs(m2), l2 = liveFixture(m2);
    const file = Object.keys(m2.journeys).find((j) => j.endsWith(STRANGER_FILE))!;
    expect(traceOf(m2, "link", file)["add"], "the new step is step 8 or later and nothing was refused by it").toEqual({ moved: [], refused: ["1:LinkNeedsHandle"] });
    expect(traceOf(withRefusal(m2, file, "link.add", "LinkNotFound"), "link", file)["add"]!.refused.map((r) => r.split(":")[1]), "a not-found is not a door").toEqual(["LinkNeedsHandle", "LinkNotFound"]);
    const portal = await stand(g2, l2.counts, [], m2);
    try { expect(await visitProblems(portal, g2, [...allVisits(m2, l2)].find((v) => v.route === `/portal/things/link?lighting=trace&journey=a-stranger-cannot-edit-a-page`)!)).toEqual([]); } finally { await portal.close(); }
  });
  it.each(PAGE)("$name", { timeout: 120_000 }, async (p) => {
    const pm = p.model === "invalid-payload" ? refusedBy("InvalidPayload") : p.model === "plugins" ? withNeeds(m) : m, pg = p.model === undefined ? graphs : fakeGraphs(pm), pl = p.model === undefined ? live : liveFixture(pm);
    const portal = await stand(pg, pl.counts, [[p.from, p.to]], pm);
    try {
      const found: Array<string> = [];
      for (const route of p.routes) {
        const visit = [...allVisits(pm, pl)].find((v) => v.route === route);
        if (visit === undefined) throw new Error(`the control names a route no pass visits: ${route}`);
        found.push(...await visitProblems(portal, pg, visit));
      }
      expect(found.some((f) => f.includes(p.says)), `expected "${p.says}" in:\n${said(found)}`).toBe(true);
    } finally { await portal.close(); }
  });
  it("the page follows the data: a state moved down five pixels in the data is drawn five pixels down", { timeout: 120_000 }, async () => {
    const swapped = structuredClone(graphs);
    const [, b] = swapped.machines["handle"]!.nodes.filter((n) => n.kind === "state") as unknown as Array<{ x: number; y: number }>;
    b!.y += 5;
    expect(graphProblems(swapped, m), "the swapped data is still a valid picture").toEqual([]);
    const portal = await stand(swapped, live.counts);
    try { expect(await visitProblems(portal, swapped, plainVisit("handle", live))).toEqual([]); } finally { await portal.close(); }
  });
});

describe("40 control: the seam instruments", () => {
  const manifest = (over: Record<string, Manifest>): Record<string, Manifest> => ({ "packages/generators/package.json": { dependencies: { elkjs: "0.12.1" } }, "packages/portal-ui/package.json": { dependencies: { "@xyflow/react": "12.12.1" } }, "packages/portal/package.json": {}, ...over });
  it("the right declarations pass, and so does React Flow as a peer dependency with an exact dev copy", () => {
    expect(elkDeclaration(manifest({}))).toEqual([]);
    expect(flowDeclaration(manifest({}))).toEqual([]);
    expect(flowDeclaration(manifest({ "packages/portal-ui/package.json": { peerDependencies: { "@xyflow/react": ">=12.12.1" }, devDependencies: { "@xyflow/react": "12.12.1" } } }))).toEqual([]);
  });
  it.each([
    ["elk not declared at all", { "packages/generators/package.json": {} }, "is not a dependency of packages/generators"],
    ["elk only a devDependency of the generator", { "packages/generators/package.json": { devDependencies: { elkjs: "0.12.1" } } }, "is not a dependency of packages/generators"],
    ["elk with a range", { "packages/generators/package.json": { dependencies: { elkjs: "^0.12.1" } } }, "pinned exactly"],
    ["elk also in the portal", { "packages/portal/package.json": { dependencies: { elkjs: "0.12.1" } } }, "only the generator's own"],
    ["elk also in portal-ui's dev dependencies", { "packages/portal-ui/package.json": { dependencies: { "@xyflow/react": "12.12.1" }, devDependencies: { elkjs: "0.12.1" } } }, "only the generator's own"],
    ["elk behind an alias in the portal", { "packages/portal/package.json": { dependencies: { layout: "npm:elkjs@0.12.1" } } }, "only the generator's own"],
    ["elk also in the root", { "package.json": { devDependencies: { elkjs: "0.12.1" } } }, "package.json (devDependencies)"],
    ["elk in the canon's own package", { "docs/canon/package.json": { dependencies: { elkjs: "0.12.1" } } }, "docs/canon/package.json"],
  ] as ReadonlyArray<readonly [string, Record<string, Manifest>, string]>)("%s", (_, over, says) => { expect(elkDeclaration(manifest(over)).join("\n")).toContain(says); });
  it.each([
    ["React Flow not declared", { "packages/portal-ui/package.json": {} }, "neither a dependency nor a peer"],
    ["React Flow with a caret", { "packages/portal-ui/package.json": { dependencies: { "@xyflow/react": "^12.12.1" } } }, "pinned exactly"],
    ["React Flow in the portal", { "packages/portal/package.json": { dependencies: { "@xyflow/react": "12.12.1" } } }, "only portal-ui may hold it"],
    ["React Flow in the generator", { "packages/generators/package.json": { dependencies: { elkjs: "0.12.1", "@xyflow/react": "12.12.1" } } }, "only portal-ui may hold it"],
  ] as ReadonlyArray<readonly [string, Record<string, Manifest>, string]>)("%s", (_, over, says) => { expect(flowDeclaration(manifest(over)).join("\n")).toContain(says); });
  it.each([
    ["elk imported in portal-ui", { "packages/generators/src/a.ts": 'import E from "elkjs";', "packages/portal-ui/src/graph.tsx": 'import E from "elkjs";\nimport { ReactFlow } from "@xyflow/react";' }, "is imported in packages/portal-ui/src/graph.tsx"],
    ["elk imported in a test of the portal", { "packages/generators/src/a.ts": 'import E from "elkjs";', "packages/portal-ui/src/g.tsx": 'import { ReactFlow } from "@xyflow/react";', "packages/portal/src/layout.test.ts": 'import E from "elkjs";' }, "is imported in packages/portal/src/layout.test.ts"],
    ["elk imported by acme's blueprint", { "packages/generators/src/a.ts": 'import E from "elkjs";', "packages/portal-ui/src/g.tsx": 'import { ReactFlow } from "@xyflow/react";', "examples/acme/blueprint/x.ts": 'await import(`elkjs`)' }, "is imported in examples/acme/blueprint/x.ts"],
    ["React Flow imported by the portal", { "packages/generators/src/a.ts": 'import E from "elkjs";', "packages/portal-ui/src/g.tsx": 'import { ReactFlow } from "@xyflow/react";', "packages/portal/src/p.tsx": 'import { ReactFlow } from "@xyflow/react";' }, "is imported in packages/portal/src/p.tsx"],
    ["the generator does not lay out with elk", { "packages/portal-ui/src/g.tsx": 'import { ReactFlow } from "@xyflow/react";' }, "the generator does not import"],
    ["portal-ui does not draw with React Flow", { "packages/generators/src/a.ts": 'import E from "elkjs";' }, "portal-ui does not import"],
  ] as ReadonlyArray<readonly [string, Record<string, string>, string]>)("%s", (_, files, says) => { expect(importProblems(files).join("\n")).toContain(says); });
  it("the right imports are none", () => { expect(importProblems({ "packages/generators/src/a.ts": 'import E from "elkjs/lib/elk.bundled.js";', "packages/generators/src/a.test.ts": 'import E from "elkjs";', "packages/portal-ui/src/g.tsx": 'import { ReactFlow } from "@xyflow/react";' })).toEqual([]); });
  it("the lockfile check refuses a pin the lockfile does not hold", () => {
    expect(lockHas("  elkjs@0.12.1:\n    resolution: {}", "elkjs", "0.12.1")).toBe(true);
    expect(lockHas("  'elkjs@0.12.1':\n    resolution: {}", "elkjs", "0.12.1")).toBe(true);
    expect(lockHas("  elkjs@0.12.1:\n", "elkjs", "0.0.0")).toBe(false);
    expect(lockHas("  elkjs@0.12.10:\n", "elkjs", "0.12.1")).toBe(false);
    expect(lockHas("", "elkjs", "none")).toBe(false);
    expect(lockHas("  foo-elkjs@0.12.1:\n    resolution: {}", "elkjs", "0.12.1"), "another package whose name ends in elkjs").toBe(false);
    expect(lockHas("  '@scope/elkjs@0.12.1':\n    resolution: {}", "elkjs", "0.12.1"), "a scoped package of the same last name").toBe(false);
    expect(lockHas("  '@scope/elkjs@0.12.1':\n", "@xyflow/react", "0.12.1")).toBe(false);
    expect(lockHas("    resolution: {integrity: elkjs@0.12.1:}\n  other: see elkjs@0.12.1: here", "elkjs", "0.12.1"), "the text in the middle of another line").toBe(false);
    expect(lockHas("  '@xyflow/react@12.12.1(react-dom@19.0.0(react@19.0.0))(react@19.0.0)':\n    dependencies: {}", "@xyflow/react", "12.12.1"), "a snapshot key with its peers").toBe(true);
    expect(lockHas("  '@xyflow/react@12.12.10':\n", "@xyflow/react", "12.12.1")).toBe(false);
  });
  it("an import is found however it is written, and a package of a similar name is not one", () => {
    const files = { "a.ts": 'import ELK from "elkjs/lib/elk.bundled.js";', "b.ts": 'const e = await import("elkjs");', "c.ts": 'const e = require("elkjs")', "g.ts": 'const e = await import(`elkjs`);', "d.ts": 'import x from "elkjs-lite"', "e.ts": 'import { a } from "not-elkjs"', "f.ts": "// elkjs is the generator's" };
    expect(importing(files, "elkjs")).toEqual(["a.ts", "b.ts", "c.ts", "g.ts"]);
    expect(importing({ "a.tsx": 'import { ReactFlow } from "@xyflow/react";', "b.ts": 'import "@xyflow/react/dist/style.css"', "c.ts": 'import x from "@xyflow/react-extra"' }, "@xyflow/react")).toEqual(["a.tsx", "b.ts"]);
  });
  it("elk in a built client is found by its name, its Java names or its option ids, and React Flow alone is clean", () => {
    expect(elkInside({ "a.js": 'var x="elkjs"' })).toHaveLength(1);
    expect(elkInside({ "b.js": 'org.eclipse.elk.core.options' })).not.toEqual([]);
    expect(elkInside({ "c.js": '{"elk.algorithm":"layered"}' })).not.toEqual([]);
    expect(elkInside({ "d.js.map": '{"sources":["../node_modules/elkjs/lib/elk.bundled.js"]}' })).not.toEqual([]);
    expect(elkInside({ "e.js": 'var react_flow="react-flow__node",xy="@xyflow/react"', "f.css": ".react-flow{}", "g.html": "<title>Portal</title>" })).toEqual([]);
  });
  // The built client is scanned by what is in each file, not by what it is called (a bundler may write `.cjs`, a worker, a chunk with no extension).
  const builtClient = (extra: Record<string, string>): string => {
    const dir = mkdtempSync(join(tmpdir(), "graph-dist-"));
    dirs.push(dir);
    for (const [path, text] of Object.entries({ "index.html": "<title>Portal</title>", "assets/app.js": 'var x="react-flow__node"', ...extra })) { mkdirSync(join(dir, path, ".."), { recursive: true }); writeFileSync(join(dir, path), text); }
    return dir;
  };
  const OLD_FILTER = (p: string) => /\.(js|mjs|css|html|map|json)$/.test(p);
  it("a built client with no elk in it is clean, whatever its files are called", () => {
    expect(elkInside(filesUnder(builtClient({ "assets/layout.cjs": "module.exports=1", "assets/chunk": "var a=1" })))).toEqual([]);
  });
  it.each([
    ["a `.cjs` file", "assets/layout.cjs"],
    ["a file with no extension", "assets/layout-chunk"],
    ["a worker with an odd extension", "assets/worker.bundle"],
    ["a file in a folder called node_modules", "node_modules/elk/worker"],
  ] as ReadonlyArray<readonly [string, string]>)("elk in %s is found, and the old scan (by extension) would have missed it", (_, path) => {
    const dir = builtClient({ [path]: 'var e=require("elkjs/lib/elk.bundled.js")' });
    expect(Object.keys(textFiles(dir, OLD_FILTER)), "the extension filter does not even read it").not.toContain(path);
    expect(elkInside(filesUnder(dir)).join("\n"), "elk in the built client").toContain(path);
  });
});
