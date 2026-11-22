// The wrong outputs check 40's controls plant (author skill, proof 5): each is one wrong thing done to a graph that is otherwise right, and the judge must
// name it. `LAID` is for the laid graphs in the portal's data (graph-expect.ts), `PAGE` for the stand-in client (graph-standin.ts), by replacing one line of it.
import type { Graphs, Laid, Placed, Route } from "./graph-expect.ts";

type Mut = (g: Graphs) => void;
const node = (l: Laid, kind: string, label: string): Placed => l.nodes.find((n) => n.kind === kind && n.label === label)!;
const edge = (l: Laid, kind: string, label?: string): Route => l.edges.find((e) => e.kind === kind && (label === undefined || e.label === label))!;
const set = (n: object, key: string, value: unknown) => { (n as Record<string, unknown>)[key] = value; };
const drop = <T>(list: ReadonlyArray<T>, item: T) => list.filter((x) => x !== item);
const mut = (l: Laid) => l as unknown as { nodes: Array<Placed>; edges: Array<Route> };
const replace = (l: Laid, key: "nodes" | "edges", items: ReadonlyArray<unknown>) => { (l as unknown as Record<string, unknown>)[key] = items; };

export interface Plant { readonly name: string; readonly model: "plugged-in" | "acme" | "needs"; readonly says: string; readonly plant: Mut }

export const LAID: ReadonlyArray<Plant> = [
  // left out
  { name: "a thing's node left out of the map", model: "plugged-in", says: "the model has 1 `thing:link`", plant: (g) => { replace(g.map, "nodes", drop(g.map.nodes, node(g.map, "thing", "link"))); } },
  { name: "the app's group left out", model: "plugged-in", says: "`group:app`", plant: (g) => { replace(g.map, "nodes", drop(g.map.nodes, node(g.map, "group", "app"))); } },
  { name: "a state left out of a machine", model: "plugged-in", says: "`state:released`", plant: (g) => { replace(g.machines["handle"]!, "nodes", drop(g.machines["handle"]!.nodes, node(g.machines["handle"]!, "state", "released"))); } },
  { name: "the entry node left out of a machine", model: "plugged-in", says: "`start`", plant: (g) => { replace(g.machines["link"]!, "nodes", drop(g.machines["link"]!.nodes, node(g.machines["link"]!, "start", "created"))); } },
  { name: "a thing's machine left out", model: "plugged-in", says: "no such graph", plant: (g) => { delete (g.machines as Record<string, Laid>)["link"]; } },
  { name: "a world left out", model: "plugged-in", says: "`world:claimed`", plant: (g) => { replace(g.worlds, "nodes", drop(g.worlds.nodes, node(g.worlds, "world", "claimed"))); } },
  { name: "a ref edge left out", model: "plugged-in", says: "edge `ref|thing:link|thing:handle|owner`", plant: (g) => { replace(g.map, "edges", drop(g.map.edges, edge(g.map, "ref", "owner"))); } },
  { name: "a payload edge left out", model: "plugged-in", says: "edge `payload|", plant: (g) => { replace(g.map, "edges", drop(g.map.edges, edge(g.map, "payload"))); } },
  { name: "a move left out", model: "plugged-in", says: "edge `move|", plant: (g) => { replace(g.machines["handle"]!, "edges", drop(g.machines["handle"]!.edges, edge(g.machines["handle"]!, "move", "release"))); } },
  { name: "a journey's edge left out", model: "plugged-in", says: "edge `starts|", plant: (g) => { replace(g.worlds, "edges", drop(g.worlds.edges, edge(g.worlds, "starts"))); } },
  // added
  { name: "a thing nobody declared", model: "plugged-in", says: "draws `thing:ghost`", plant: (g) => { mut(g.map).nodes = [...g.map.nodes, { ...node(g.map, "thing", "link"), id: "ghost", label: "ghost", x: 400 }]; } },
  { name: "an extra state", model: "plugged-in", says: "draws `state:archived`", plant: (g) => { mut(g.machines["link"]!).nodes = [...g.machines["link"]!.nodes, { ...node(g.machines["link"]!, "state", "listed"), id: "x", label: "archived", y: 300 }]; } },
  { name: "a machine for a thing with none", model: "plugged-in", says: "hold a machine for a thing that has none", plant: (g) => { (g.machines as Record<string, Laid>)["profile"] = g.machines["link"]!; } },
  { name: "an `on:` edge nobody declared", model: "plugged-in", says: "the graph draws edge `on|", plant: (g) => { mut(g.map).edges = [...g.map.edges, { ...edge(g.map, "ref", "owner"), id: "on1", kind: "on", label: "HandleClaimed" }]; } },
  { name: "an extra move edge", model: "plugged-in", says: "the graph draws edge `move|", plant: (g) => { mut(g.machines["handle"]!).edges = [...g.machines["handle"]!.edges, { ...edge(g.machines["handle"]!, "move", "release"), id: "m9", label: "revive" }]; } },
  // repeated, or two to one
  { name: "a thing drawn twice", model: "plugged-in", says: "the model has 1 `thing:profile` and the graph draws 2", plant: (g) => { mut(g.map).nodes = [...g.map.nodes, { ...node(g.map, "thing", "profile"), id: "p2" }]; } },
  { name: "one node id on two nodes", model: "plugged-in", says: "is on more than one node", plant: (g) => { const [a, b] = g.map.nodes.filter((n) => n.kind === "thing") as [Placed, Placed]; set(b, "id", a.id); } },
  { name: "a payload edge twice", model: "plugged-in", says: "the graph draws 2", plant: (g) => { mut(g.map).edges = [...g.map.edges, { ...edge(g.map, "payload"), id: "dup" }]; } },
  { name: "a move twice", model: "plugged-in", says: "the model has 1 edge `move|", plant: (g) => { mut(g.machines["link"]!).edges = [...g.machines["link"]!.edges, { ...edge(g.machines["link"]!, "move", "add"), id: "dup" }]; } },
  { name: "a chained world drawn from the start, not from the world it begins from (acme: funded)", model: "acme", says: "the model has 1 edge `from|world:founded|world:funded", plant: (g) => { const e = g.worlds.edges.find((x) => x.kind === "from" && x.to === "world:funded")!; set(e, "from", g.worlds.nodes.find((n) => n.kind === "start")!.id); } },
  // wrong
  { name: "a thing in no group", model: "plugged-in", says: "sits in no group, the model says group:app", plant: (g) => { delete (node(g.map, "thing", "profile") as { parent?: string }).parent; } },
  { name: "a thing in a group that is no node", model: "plugged-in", says: "which is no node", plant: (g) => { set(node(g.map, "thing", "profile"), "parent", "nowhere"); } },
  { name: "a thing of another kind", model: "plugged-in", says: "`thing:handle`", plant: (g) => { set(node(g.map, "thing", "handle"), "kind", "state"); } },
  { name: "an edge the wrong way round", model: "plugged-in", says: "edge `ref|thing:handle|thing:link", plant: (g) => { const e = edge(g.map, "ref", "owner"); const f = e.from; set(e, "from", e.to); set(e, "to", f); } },
  { name: "a ref edge with another field's name", model: "plugged-in", says: "edge `ref|thing:link|thing:handle|owner`", plant: (g) => { set(edge(g.map, "ref", "owner"), "label", "handle"); } },
  { name: "a payload edge with no label", model: "plugged-in", says: "edge `payload|", plant: (g) => { set(edge(g.map, "payload"), "label", undefined); } },
  { name: "a move that goes to another state", model: "plugged-in", says: "edge `move|", plant: (g) => { const e = edge(g.machines["handle"]!, "move", "release"); set(e, "to", e.from); } },
  { name: "a move that leaves the entry when the model says a state", model: "plugged-in", says: "edge `move|", plant: (g) => { const l = g.machines["handle"]!; set(edge(l, "move", "release"), "from", node(l, "start", "created").id); } },
  { name: "a move whose note is another event", model: "plugged-in", says: "does not name the event HandleClaimed", plant: (g) => { set(edge(g.machines["handle"]!, "move", "claim"), "note", "emits HandleReleased"); } },
  { name: "a move with no note", model: "plugged-in", says: "does not name the event", plant: (g) => { set(edge(g.machines["link"]!, "move", "add"), "note", undefined); } },
  { name: "a journey on another world's chain", model: "plugged-in", says: "edge `starts|", plant: (g) => { const e = edge(g.worlds, "starts"); set(e, "from", node(g.worlds, "start", "created").id); } },
  // geometry
  { name: "two siblings on one spot", model: "plugged-in", says: "overlap", plant: (g) => { const l = g.map.nodes.filter((n) => n.kind === "thing"); set(l[1]!, "x", l[0]!.x); set(l[1]!, "y", l[0]!.y); } },
  { name: "every node at the origin", model: "plugged-in", says: "overlap", plant: (g) => { for (const n of g.machines["handle"]!.nodes) { set(n, "x", 0); set(n, "y", 0); } } },
  { name: "a child outside its group", model: "plugged-in", says: "reaches outside its group", plant: (g) => { set(node(g.map, "thing", "link"), "x", 5000); } },
  { name: "a node outside the graph", model: "plugged-in", says: "reaches outside the graph", plant: (g) => { set(node(g.machines["handle"]!, "state", "released"), "x", 9000); } },
  { name: "a position that is not a number", model: "plugged-in", says: "no real position", plant: (g) => { set(node(g.map, "thing", "link"), "x", "12"); } },
  { name: "a position that is null", model: "plugged-in", says: "no real position", plant: (g) => { set(node(g.map, "thing", "link"), "y", null); } },
  { name: "a position that is NaN", model: "plugged-in", says: "no real position", plant: (g) => { set(node(g.map, "thing", "link"), "x", Number.NaN); } },
  { name: "a node of no size", model: "plugged-in", says: "no real position", plant: (g) => { set(node(g.machines["link"]!, "state", "listed"), "w", 0); } },
  { name: "a negative position", model: "plugged-in", says: "no real position", plant: (g) => { set(node(g.machines["link"]!, "state", "listed"), "x", -10); } },
  { name: "a graph of no size", model: "plugged-in", says: "width and height are not positive", plant: (g) => { set(g.worlds, "width", 0); } },
  { name: "an edge of one point", model: "plugged-in", says: "no route of two points or more", plant: (g) => { set(edge(g.map, "ref", "owner"), "points", [{ x: 1, y: 1 }]); } },
  { name: "an edge with no route", model: "plugged-in", says: "no route of two points or more", plant: (g) => { set(edge(g.map, "ref", "owner"), "points", null); } },
  { name: "an edge that does not start on its source", model: "plugged-in", says: "does not start on its source", plant: (g) => { set(edge(g.machines["handle"]!, "move", "claim"), "points", [{ x: 4000, y: 4000 }, { x: 4001, y: 4000 }]); } },
  { name: "an edge that does not end on its target", model: "plugged-in", says: "does not end on its target", plant: (g) => { const e = edge(g.machines["handle"]!, "move", "release"); set(e, "points", [e.points[0], { x: 4000, y: 4000 }]); } },
  { name: "an edge to a node that is not there", model: "plugged-in", says: "one of them is no node", plant: (g) => { set(edge(g.map, "ref", "owner"), "to", "nowhere"); } },
  // found by the hostile pass
  { name: "a route that leaves the graph between its two ends", model: "plugged-in", says: "runs outside the graph", plant: (g) => { const e = edge(g.map, "ref", "owner"); set(e, "points", [e.points[0], { x: 1e9, y: -1e9 }, e.points[e.points.length - 1]]); } },
  { name: "a canvas a million times what it holds", model: "plugged-in", says: "the graph is 1000000000 by", plant: (g) => { set(g.machines["link"]!, "width", 1e9); set(g.machines["link"]!, "height", 1e9); } },
  { name: "nodes of one pixel, edges re-pointed", model: "plugged-in", says: "a size of at least 12", plant: (g) => { for (const n of g.machines["handle"]!.nodes) { set(n, "w", 1); set(n, "h", 1); } } },
  { name: "a machine laid out against its edges", model: "plugged-in", says: "lies left of the entry", plant: (g) => { const l = g.machines["handle"]!; for (const n of l.nodes) set(n, "x", l.width - n.x - n.w); for (const e of l.edges) set(e, "points", e.points.map((p) => ({ x: l.width - p.x, y: p.y }))); } },
  { name: "the worlds laid out against their edges", model: "acme", says: "lies left of the entry", plant: (g) => { const l = g.worlds; for (const n of l.nodes) set(n, "x", l.width - n.x - n.w); for (const e of l.edges) set(e, "points", e.points.map((p) => ({ x: l.width - p.x, y: p.y }))); } },
  { name: "a key in graphs nobody asked for", model: "plugged-in", says: "graphs.extra", plant: (g) => { (g as unknown as Record<string, unknown>)["extra"] = structuredClone(g.map); } },
  { name: "a graph that names itself like another", model: "plugged-in", says: "no two share a name", plant: (g) => { set(g.worlds, "id", g.map.id); } },
  { name: "a graph with no name", model: "plugged-in", says: "each graph names itself", plant: (g) => { set(g.machines["link"]!, "id", ""); } },
  // `needs` edges, over a model where greet needs echo (`needs: ["feature:echo"]`) and extra needs nothing
  { name: "a `needs` edge dropped: greet needs echo and the map does not say so", model: "needs", says: "the model has 1 edge `needs|group:greet|group:echo|needs` and the graph draws 0", plant: (g) => { replace(g.map, "edges", drop(g.map.edges, edge(g.map, "needs"))); } },
  { name: "a `needs` edge turned round: echo needs greet", model: "needs", says: "the graph draws edge `needs|group:echo|group:greet|needs`", plant: (g) => { const e = edge(g.map, "needs"); set(e, "from", e.to); set(e, "to", "group:greet"); } },
  { name: "a spurious `needs` edge: extra needs echo, and nothing says so", model: "needs", says: "the graph draws edge `needs|group:extra|group:echo|needs`", plant: (g) => { const e = edge(g.map, "needs"); mut(g.map).edges.push({ ...e, id: "needs:extra", from: "group:extra" }); } },
  { name: "a `needs` edge drawn twice", model: "needs", says: "the model has 1 edge `needs|group:greet|group:echo|needs` and the graph draws 2", plant: (g) => { const e = edge(g.map, "needs"); mut(g.map).edges.push({ ...e, id: "needs:again" }); } },
  { name: "a `needs` edge drawn as a `mounts` edge", model: "needs", says: "the graph draws edge `mounts|group:greet|group:echo|mounts`", plant: (g) => { const e = edge(g.map, "needs"); set(e, "kind", "mounts"); set(e, "label", "mounts"); } },
  { name: "a move whose note names every event of its thing", model: "plugged-in", says: "also names HandleReleased", plant: (g) => { set(edge(g.machines["handle"]!, "move", "claim"), "note", "emits HandleClaimed HandleReleased"); } },
];
