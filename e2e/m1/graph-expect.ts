// What check 40 (M1.50) judges a laid graph against. Everything expected comes out of the model (`wire.model`), never out of the laid
// graph being judged: `expectedGraphs` is a pure function of the model, and `structureProblems` / `geometryProblems` say what is wrong
// with one `Laid` in plain sentences (an empty list is a pass).
//
// The wire (the contract the builder meets, from `spikes/react-flow-graphs`' `Laid`): `generated/portal/blueprint.json` carries a top-level
// `graphs: { map, worlds, machines: { <thing>: Laid } }` (a machine for each thing that has one and none for a thing that has none), and
//   Laid  = { id, width, height, nodes: Placed[], edges: Route[] }
//   Placed = { id, kind, label, parent?, x, y, w, h, ...whatever its component needs }   x, y relative to its parent (React Flow's way)
//   Route  = { id, kind, from, to, label?, note?, points: {x, y}[], ...whatever }        from/to are node ids; points in the graph's own coordinates
// Nodes and edges are told apart by what they ARE (kind and label, endpoints by their kinds and labels), never by their ids, which are the builder's.

export interface Pt { readonly x: number; readonly y: number }
export interface Placed { readonly id: string; readonly kind: string; readonly label: string; readonly parent?: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Route { readonly id: string; readonly kind: string; readonly from: string; readonly to: string; readonly label?: string; readonly note?: string; readonly points: ReadonlyArray<Pt> }
export interface Laid { readonly id: string; readonly width: number; readonly height: number; readonly nodes: ReadonlyArray<Placed>; readonly edges: ReadonlyArray<Route> }
export interface Graphs { readonly map: Laid; readonly worlds: Laid; readonly machines: Readonly<Record<string, Laid>> }

// ---- the model, as far as the graphs read it ----

interface Move { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }
export interface GraphModel {
  readonly things: Readonly<Record<string, { readonly name: string; readonly from: { readonly kind: string; readonly mount?: string }; readonly fields: Readonly<Record<string, { readonly ref?: string }>>; readonly events: Readonly<Record<string, unknown>>; readonly machine: null | { readonly states: ReadonlyArray<string>; readonly moves: Readonly<Record<string, Move>> } }>>;
  readonly operations: Readonly<Record<string, { readonly name: string; readonly thing: string; readonly payload: Readonly<Record<string, { readonly ref?: string }>>; readonly move: null | { readonly key: string } }>>;
  readonly mounts?: Readonly<Record<string, { readonly kind: string; readonly needs?: ReadonlyArray<string> }>>;
  readonly startingWorlds: Readonly<Record<string, { readonly name: string; readonly from: string | null }>>;
  readonly journeys: Readonly<Record<string, { readonly name: string; readonly starts: string | null; readonly steps: ReadonlyArray<{ readonly call: { readonly operation: string }; readonly checks: ReadonlyArray<{ readonly kind: string; readonly error?: string; readonly event?: string }> }> }>>;
}

// ---- what the graphs must hold ----

export interface XNode { readonly key: string; readonly kind: string; readonly parent?: string }
/** `label` null: the check does not pin it. `noteHas`: the edge's `note` must name this event. */
export interface XEdge { readonly kind: string; readonly from: string; readonly to: string; readonly label: string | null; readonly noteHas?: string; readonly noteLacks?: ReadonlyArray<string> }
export interface Spec { readonly nodes: ReadonlyArray<XNode>; readonly edges: ReadonlyArray<XEdge> }

const START = "start";
const nodeKey = (kind: string, label: string) => `${kind}:${label}`;
const edge = (kind: string, from: string, to: string, label: string | null, noteHas?: string, noteLacks?: ReadonlyArray<string>): XEdge => ({ kind, from, to, label, ...(noteHas === undefined ? {} : { noteHas, noteLacks: noteLacks ?? [] }) });
const refThing = (ref: string | undefined) => ref?.split(".")[0];

/** The blueprint map: every thing inside the app or the plugin it comes from, the ids that tie things (fields, payloads), the mounts and the needs. `on:` handlers wait for M3.08: the model carries none, so none is drawn. */
export const mapSpec = (m: GraphModel): Spec => {
  const things = Object.values(m.things);
  const plugins = [...new Set(things.flatMap((t) => (t.from.kind === "app" || t.from.mount === undefined ? [] : [t.from.mount])))].sort();
  const groupOf = (t: GraphModel["things"][string]) => nodeKey("group", t.from.kind === "app" || t.from.mount === undefined ? "app" : t.from.mount);
  const nodes: Array<XNode> = [
    ...(things.some((t) => t.from.kind === "app") ? [{ key: nodeKey("group", "app"), kind: "group" }] : []),
    ...plugins.map((p) => ({ key: nodeKey("group", p), kind: "group" })),
    ...things.map((t) => ({ key: nodeKey("thing", t.name), kind: "thing", parent: groupOf(t) })),
  ];
  const refs = new Map<string, Array<string>>();
  for (const t of things) for (const [field, f] of Object.entries(t.fields)) {
    const target = refThing(f.ref);
    if (target !== undefined && target !== t.name && m.things[target] !== undefined) refs.set(`${t.name}>${target}`, [...(refs.get(`${t.name}>${target}`) ?? []), field]);
  }
  const edges: Array<XEdge> = [...refs].map(([pair, fields]) => { const [a, b] = pair.split(">") as [string, string]; return edge("ref", nodeKey("thing", a), nodeKey("thing", b), [...fields].sort().join(", ")); });
  for (const op of Object.values(m.operations)) for (const [field, f] of Object.entries(op.payload)) {
    const target = refThing(f.ref);
    if (target !== undefined && target !== op.thing && m.things[target] !== undefined) edges.push(edge("payload", nodeKey("thing", op.thing), nodeKey("thing", target), `${op.name} { ${field} }`));
  }
  if (things.some((t) => t.from.kind === "app")) for (const p of plugins) edges.push(edge("mounts", nodeKey("group", "app"), nodeKey("group", p), "mounts"));
  // A mount's `needs` are `kind:name` ("feature:echo", as check 06 reads them); a group is the plugin's bare name. A need on a mount that holds no thing has no group to join.
  for (const p of plugins) for (const need of m.mounts?.[p]?.needs ?? []) { const n = need.slice(need.indexOf(":") + 1); if (n !== p && plugins.includes(n)) edges.push(edge("needs", nodeKey("group", p), nodeKey("group", n), "needs")); }
  return { nodes, edges };
};

/** One machine: its states, one entry node, and a move edge for each state a move leaves (the entry when it leaves none) and each it reaches. */
export const machineSpec = (m: GraphModel, thing: string): Spec => {
  const machine = m.things[thing]!.machine!;
  const nodes: Array<XNode> = [{ key: START, kind: "start" }, ...machine.states.map((s) => ({ key: nodeKey("state", s), kind: "state" }))];
  const edges = Object.entries(machine.moves).flatMap(([key, mv]) => (mv.from.length === 0 ? [START] : mv.from.map((f) => nodeKey("state", f)))
    .flatMap((from) => mv.to.map((to) => edge("move", from, nodeKey("state", to), key, mv.emits, Object.keys(m.things[thing]!.events).filter((e) => e !== mv.emits)))));
  return { nodes, edges };
};

/** The worlds' `from` chain, rooted at the empty world, with each journey hung from the world it starts on. */
export const worldsSpec = (m: GraphModel): Spec => {
  const worlds = Object.values(m.startingWorlds), journeys = Object.values(m.journeys);
  const at = (name: string | null) => (name === null ? START : nodeKey("world", name));
  return {
    nodes: [{ key: START, kind: "start" }, ...worlds.map((w) => ({ key: nodeKey("world", w.name), kind: "world" })), ...journeys.map((j) => ({ key: nodeKey("journey", j.name), kind: "journey" }))],
    edges: [...worlds.map((w) => edge("from", at(w.from), nodeKey("world", w.name), null)), ...journeys.map((j) => edge("starts", at(j.starts), nodeKey("journey", j.name), null))],
  };
};

export const machineThings = (m: GraphModel): ReadonlyArray<string> => Object.values(m.things).filter((t) => t.machine !== null).map((t) => t.name);

// ---- judging one laid graph ----

const keyOf = (n: Placed) => (n.kind === "start" ? START : nodeKey(n.kind, n.label));
const normal = (kind: string, label: string | null | undefined) => (label === null || label === undefined ? null : kind === "ref" ? label.split(",").map((s) => s.trim()).sort().join(", ") : label);
const counts = (items: ReadonlyArray<string>) => items.reduce<Map<string, number>>((all, k) => all.set(k, (all.get(k) ?? 0) + 1), new Map());
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The graph's nodes and edges against the model's, as a set: what is missing, what is added, what is repeated, what is wrong way round. */
export const structureProblems = (what: string, laid: Laid | undefined, spec: Spec): ReadonlyArray<string> => {
  if (laid === undefined || laid === null || typeof laid !== "object") return [`${what}: the portal's data has no such graph`];
  if (!Array.isArray(laid.nodes) || !Array.isArray(laid.edges)) return [`${what}: the graph has no \`nodes\` and \`edges\` lists`];
  const out: Array<string> = [];
  const ids = laid.nodes.map((n) => n.id);
  for (const id of new Set(ids.filter((i, k) => ids.indexOf(i) !== k))) out.push(`${what}: node id "${id}" is on more than one node`);
  const eids = laid.edges.map((e) => e.id);
  for (const id of new Set(eids.filter((i, k) => eids.indexOf(i) !== k))) out.push(`${what}: edge id "${id}" is on more than one edge`);
  const byId = new Map(laid.nodes.map((n) => [n.id, n]));
  const have = counts(laid.nodes.map((n) => `${keyOf(n)}`)), want = counts(spec.nodes.map((n) => n.key));
  for (const [k, n] of want) if ((have.get(k) ?? 0) !== n) out.push(`${what}: the model has ${String(n)} \`${k}\` and the graph draws ${String(have.get(k) ?? 0)}`);
  for (const [k, n] of have) if (!want.has(k)) out.push(`${what}: the graph draws \`${k}\` (${String(n)}) and the model has none`);
  for (const n of laid.nodes) {
    const x = spec.nodes.find((s) => s.key === keyOf(n));
    if (x !== undefined && x.kind !== n.kind) out.push(`${what}: \`${keyOf(n)}\` is of kind ${n.kind}, the model says ${x.kind}`);
    const parent = n.parent === undefined || n.parent === null ? undefined : byId.get(n.parent);
    if (n.parent !== undefined && n.parent !== null && parent === undefined) out.push(`${what}: \`${keyOf(n)}\` sits in "${n.parent}", which is no node`);
    if (x !== undefined) {
      const got = parent === undefined ? undefined : keyOf(parent);
      if (got !== x.parent) out.push(`${what}: \`${keyOf(n)}\` sits in ${got ?? "no group"}, the model says ${x.parent ?? "no group"}`);
    }
  }
  const ends = (e: Route) => { const a = byId.get(e.from), b = byId.get(e.to); return a === undefined || b === undefined ? undefined : [keyOf(a), keyOf(b)] as const; };
  const sig = (kind: string, from: string, to: string, label: string | null) => `${kind}|${from}|${to}|${label ?? "*"}`;
  const got = new Map<string, number>();
  for (const e of laid.edges) {
    const t = ends(e);
    if (t === undefined) { out.push(`${what}: edge "${e.id}" joins "${e.from}" and "${e.to}", and one of them is no node`); continue; }
    const wantLabel = spec.edges.find((s) => s.kind === e.kind && s.from === t[0] && s.to === t[1])?.label;
    const k = sig(e.kind, t[0], t[1], wantLabel === null ? null : normal(e.kind, e.label));
    got.set(k, (got.get(k) ?? 0) + 1);
  }
  const need = counts(spec.edges.map((s) => sig(s.kind, s.from, s.to, normal(s.kind, s.label))));
  for (const [k, n] of need) if ((got.get(k) ?? 0) !== n) out.push(`${what}: the model has ${String(n)} edge \`${k}\` and the graph draws ${String(got.get(k) ?? 0)}`);
  for (const [k, n] of got) if (!need.has(k)) out.push(`${what}: the graph draws edge \`${k}\` (${String(n)}) and the model has none`);
  for (const s of spec.edges) if (s.noteHas !== undefined) {
    for (const e of laid.edges) {
      const t = ends(e);
      if (t !== undefined && e.kind === s.kind && t[0] === s.from && t[1] === s.to && e.label === s.label && !(e.note ?? "").includes(s.noteHas)) out.push(`${what}: the \`${String(s.label)}\` edge's note "${e.note ?? ""}" does not name the event ${s.noteHas}`);
      if (t !== undefined && e.kind === s.kind && t[0] === s.from && t[1] === s.to && e.label === s.label) for (const other of s.noteLacks ?? []) if ((e.note ?? "").includes(other)) out.push(`${what}: the \`${String(s.label)}\` edge's note "${e.note ?? ""}" also names ${other}, an event of the thing's that the move does not emit`);
    }
  }
  return out;
};

const absolute = (n: Placed, byId: Map<string, Placed>): Pt => {
  let x = n.x, y = n.y;
  for (let p = n.parent === undefined ? undefined : byId.get(n.parent), guard = 0; p !== undefined && guard < 50; p = p.parent === undefined ? undefined : byId.get(p.parent), guard++) { x += p.x; y += p.y; }
  return { x, y };
};
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const SLACK = 2, MIN_BOX = 12, ROOM = 120;

/** Positions that are a picture: every box a real size, none on another, children inside their group, every edge a route from its source to its target. */
export const geometryProblems = (what: string, laid: Laid | undefined, entryFirst = false): ReadonlyArray<string> => {
  if (laid === undefined || laid === null || !Array.isArray(laid.nodes) || !Array.isArray(laid.edges)) return [];
  const out: Array<string> = [];
  if (!num(laid.width) || !num(laid.height) || laid.width <= 0 || laid.height <= 0) out.push(`${what}: the graph's width and height are not positive numbers`);
  const byId = new Map(laid.nodes.map((n) => [n.id, n]));
  const bad = new Set<string>();
  for (const n of laid.nodes) if (![n.x, n.y, n.w, n.h].every(num) || n.w < (n.kind === "group" ? 1 : MIN_BOX) || n.h < (n.kind === "group" ? 1 : MIN_BOX) || n.x < 0 || n.y < 0) { out.push(`${what}: \`${keyOf(n)}\` has no real position and a size of at least ${String(MIN_BOX)} (x ${String(n.x)}, y ${String(n.y)}, w ${String(n.w)}, h ${String(n.h)})`); bad.add(n.id); }
  const good = laid.nodes.filter((n) => !bad.has(n.id));
  for (const [i, a] of good.entries()) for (const b of good.slice(i + 1)) if ((a.parent ?? "") === (b.parent ?? "") && overlap(a, b)) out.push(`${what}: \`${keyOf(a)}\` and \`${keyOf(b)}\` overlap`);
  for (const n of good) {
    const p = n.parent === undefined ? undefined : byId.get(n.parent);
    if (p === undefined || bad.has(p.id)) { if (n.x + n.w > laid.width + SLACK || n.y + n.h > laid.height + SLACK) out.push(`${what}: \`${keyOf(n)}\` reaches outside the graph's ${String(laid.width)} by ${String(laid.height)}`); continue; }
    if (n.x + n.w > p.w + SLACK || n.y + n.h > p.h + SLACK) out.push(`${what}: \`${keyOf(n)}\` reaches outside its group \`${keyOf(p)}\``);
  }
  // The canvas fits what it holds: every node and route inside it, and no more than a margin of room around them.
  const all = good.map((n) => { const p = absolute(n, byId); return { x: p.x, y: p.y, w: n.w, h: n.h }; });
  const right = Math.max(0, ...all.map((b) => b.x + b.w), ...laid.edges.flatMap((e) => (Array.isArray(e.points) ? e.points.filter((p: Pt) => p !== null && num(p.x)).map((p: Pt) => p.x) : [])));
  const down = Math.max(0, ...all.map((b) => b.y + b.h), ...laid.edges.flatMap((e) => (Array.isArray(e.points) ? e.points.filter((p: Pt) => p !== null && num(p.y)).map((p: Pt) => p.y) : [])));
  if (num(laid.width) && num(laid.height) && (laid.width > right + ROOM || laid.height > down + ROOM)) out.push(`${what}: the graph is ${String(laid.width)} by ${String(laid.height)} and what it holds reaches ${String(Math.ceil(right))} by ${String(Math.ceil(down))}`);
  // A layered picture starts at the entry: in a machine and in the worlds, the entry is the left-most node.
  if (entryFirst) {
    const entry = good.find((n) => n.kind === "start");
    if (entry !== undefined) for (const n of good) if (n !== entry && absolute(n, byId).x + SLACK < absolute(entry, byId).x) out.push(`${what}: \`${keyOf(n)}\` lies left of the entry: the layout runs against its edges`);
  }
  const box = (id: string) => { const n = byId.get(id); return n === undefined || bad.has(id) ? undefined : { ...absolute(n, byId), w: n.w, h: n.h }; };
  const within = (p: Pt, b: { x: number; y: number; w: number; h: number }) => p.x >= b.x - SLACK && p.x <= b.x + b.w + SLACK && p.y >= b.y - SLACK && p.y <= b.y + b.h + SLACK;
  for (const e of laid.edges) {
    const pts = e.points;
    if (!Array.isArray(pts) || pts.length < 2 || !pts.every((p) => p !== null && typeof p === "object" && num(p.x) && num(p.y))) { out.push(`${what}: edge \`${e.kind}\` "${e.id}" has no route of two points or more`); continue; }
    if (pts.some((p) => p.x < -SLACK || p.y < -SLACK || p.x > laid.width + SLACK || p.y > laid.height + SLACK)) out.push(`${what}: edge "${e.id}" runs outside the graph`);
    const a = box(e.from), b = box(e.to);
    if (a !== undefined && !within(pts[0]!, a)) out.push(`${what}: edge "${e.id}" does not start on its source`);
    if (b !== undefined && !within(pts[pts.length - 1]!, b)) out.push(`${what}: edge "${e.id}" does not end on its target`);
  }
  return out;
};

/** Every graph the portal's data must carry for a model, judged: the map, the worlds, a machine for each thing with one and none for one without. */
export const graphProblems = (graphs: Graphs | undefined, m: GraphModel): ReadonlyArray<string> => {
  if (graphs === undefined || graphs === null || typeof graphs !== "object") return ["the portal's data (generated/portal/blueprint.json) has no `graphs`"];
  const out: Array<string> = [
    ...Object.keys(graphs).filter((k) => !["map", "worlds", "machines"].includes(k)).map((k) => `graphs.${k}: the portal's graphs are the map, the worlds and the machines, nothing else`),
    ...structureProblems("map", graphs.map, mapSpec(m)), ...geometryProblems("map", graphs.map),
    ...structureProblems("worlds", graphs.worlds, worldsSpec(m)), ...geometryProblems("worlds", graphs.worlds, true),
  ];
  const wanted = machineThings(m);
  for (const t of wanted) out.push(...structureProblems(`machine ${t}`, graphs.machines?.[t], machineSpec(m, t)), ...geometryProblems(`machine ${t}`, graphs.machines?.[t], true));
  const ids = [graphs.map, graphs.worlds, ...wanted.map((t) => graphs.machines?.[t])].map((l) => l?.id);
  for (const id of ids) if (typeof id !== "string" || id === "" || ids.filter((i) => i === id).length > 1) out.push(`a graph's \`id\` is ${JSON.stringify(id)}: each graph names itself, and no two share a name`);
  for (const t of Object.keys(graphs.machines ?? {})) if (!wanted.includes(t)) out.push(`machine ${t}: the graphs hold a machine for a thing that has none`);
  return out;
};
