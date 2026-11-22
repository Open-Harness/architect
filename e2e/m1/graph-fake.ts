// Check 40's stand-in generator: a plain, deterministic layout of the model's expected graphs, written here so the judge and the stand-in client
// have a picture to look at. It is not elk and not the builder's: it only has to be a valid picture (real sizes, nothing overlapping, children
// inside their group, routes from source to target). The real generator lays out with `elkjs` (M1.50); this one never ships.
import { machineSpec, machineThings, mapSpec, worldsSpec, type GraphModel, type Graphs, type Laid, type Placed, type Route, type Spec } from "./graph-expect.ts";

const W = 132, H = 44, GAP = 56, PAD = 20, TOP = 40;
const labelOf = (key: string) => (key === "start" ? "created" : key.slice(key.indexOf(":") + 1));

export const fakeLaid = (id: string, spec: Spec): Laid => {
  const edgesOf = spec.edges;
  const roots = spec.nodes.filter((n) => n.parent === undefined);
  const placed = new Map<string, Placed>();
  const put = (key: string, x: number, y: number, w: number, h: number) => {
    const n = spec.nodes.find((s) => s.key === key)!;
    placed.set(key, { id: key, kind: n.kind, label: labelOf(key), ...(n.parent === undefined ? {} : { parent: n.parent }), x, y, w, h });
  };
  // Depth by longest path from a node nothing reaches, among the roots that are not groups (a cycle stops where it started).
  const loose = roots.filter((n) => n.kind !== "group");
  const depth = new Map<string, number>();
  const walk = (key: string, seen: ReadonlyArray<string>): number => {
    if (depth.has(key)) return depth.get(key)!;
    const ins = edgesOf.filter((e) => e.to === key && e.from !== key && !seen.includes(e.from) && loose.some((n) => n.key === e.from));
    const d = ins.length === 0 ? 0 : 1 + Math.max(...ins.map((e) => walk(e.from, [...seen, key])));
    depth.set(key, d);
    return d;
  };
  const rowAt = new Map<number, number>();
  let right = 0, down = 0;
  for (const n of loose) {
    const d = walk(n.key, []), row = rowAt.get(d) ?? 0;
    rowAt.set(d, row + 1);
    put(n.key, PAD + d * (W + GAP), PAD + row * (H + 30), W, H);
    right = Math.max(right, PAD + d * (W + GAP) + W + PAD);
    down = Math.max(down, PAD + row * (H + 30) + H + PAD);
  }
  let x = PAD;
  for (const g of roots.filter((n) => n.kind === "group")) {
    const kids = spec.nodes.filter((n) => n.parent === g.key);
    kids.forEach((k, i) => put(k.key, PAD + i * (W + 20), TOP, W, H));
    const w = PAD + kids.length * (W + 20) + 0, h = TOP + H + PAD;
    put(g.key, x, down + PAD, w, h);
    x += w + GAP;
    right = Math.max(right, x);
  }
  const groups = roots.filter((n) => n.kind === "group");
  const height = down + (groups.length === 0 ? 0 : PAD + TOP + H + PAD + PAD);
  const abs = (key: string): { x: number; y: number; w: number; h: number } => {
    const n = placed.get(key)!, p = n.parent === undefined ? { x: 0, y: 0 } : abs(n.parent);
    return { x: n.x + p.x, y: n.y + p.y, w: n.w, h: n.h };
  };
  const edges = edgesOf.map((e, i): Route => {
    const a = abs(e.from), b = abs(e.to);
    // A move from a state to itself is a loop under the box (a route of no length is no line).
    const loop = e.from === e.to ? [{ x: a.x + a.w * 0.75, y: a.y + a.h }, { x: a.x + a.w * 0.75, y: a.y + a.h + 14 }, { x: a.x + a.w * 0.25, y: a.y + a.h + 14 }, { x: a.x + a.w * 0.25, y: a.y + a.h }] : undefined;
    return { id: `${e.kind}:${String(i)}`, kind: e.kind, from: e.from, to: e.to, ...(e.label === null ? {} : { label: e.label }), ...(e.noteHas === undefined ? {} : { note: `emits ${e.noteHas}` }), points: loop ?? [{ x: a.x + a.w / 2, y: a.y + a.h / 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }] };
  });
  return { id, width: Math.max(right, 1), height: Math.max(height, down, 1), nodes: spec.nodes.map((n) => placed.get(n.key)!), edges };
};

/** What a correct generator hands the portal's data for a model. */
export const fakeGraphs = (m: GraphModel): Graphs => ({
  map: fakeLaid("map", mapSpec(m)),
  worlds: fakeLaid("worlds", worldsSpec(m)),
  machines: Object.fromEntries(machineThings(m).map((t) => [t, fakeLaid(`machine-${t}`, machineSpec(m, t))])),
});

/**
 * A model whose greet plugin needs the echo plugin, as check 06 reads one off a real project (`mounts.greet.needs` is `["feature:echo"]`: kind, a colon, the
 * mount's name), over Plugged In: an echo thing and a greet thing, each from its own mount, and `extra`, a third plugin that needs nothing.
 */
export const withNeeds = (m: GraphModel): GraphModel => {
  const thing = (name: string, mount: string) => [name, { name, from: { kind: "feature", mount }, fields: {}, events: {}, machine: null }] as const;
  return {
    ...m,
    things: { ...m.things, ...Object.fromEntries([thing("echo", "echo"), thing("greet", "greet"), thing("extra", "extra")]) },
    mounts: { ...m.mounts, echo: { kind: "feature", needs: [] }, greet: { kind: "feature", needs: ["feature:echo"] }, extra: { kind: "feature", needs: [] } },
  };
};
