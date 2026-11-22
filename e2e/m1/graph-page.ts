// The judge of check 40's browser half: reads a served portal's pages in headless Chromium (as checks 21 and 28 do) and says what is wrong with the graphs
// it draws. The hooks a builder owes (`data-portal="<part>"`, data in `data-*`, only what a person can see counts: not hidden, not near-transparent):
//   graph       data-graph "map" | "worlds" | "machine:<thing>", data-mode "structure" | "live" | "trace", data-width, data-height (the laid graph's own size)
//   graph-node  data-node (the laid node's id), data-kind, data-parent ("" at the root), data-x, data-y, data-w, data-h (the laid numbers, as the data has them);
//               the node's own text carries its label; a state shows nothing but its name (no count in its text, no `::before`/`::after` content, no
//               data-count, data-lit, data-moved or data-refused: lighting is on edges, never on a state; nothing inside it, seen or not, with a `data-count`; no
//               `title` or `aria-label` on it or in it with a number in it), and no digit shows anywhere in a machine's graph outside a move edge's own text and
//               the states' names (not beside a state either: `2x`, `x2`, `2 moves` are refused where they stand)
//   graph-edge  data-edge (the laid edge's id), data-kind, data-from, data-to (node ids), data-lit "true"|"false", data-count (a number on a live move, else ""),
//               data-moved ("8,10": the trace's steps the move was made at, else ""), data-refused ("10:link.notFrom": step and refusal, else ""); its text carries its
//               label (a move's key). A move edge sits inside the `move` check 21 reads (`data-portal="move"`, data-move the move's key, data-lit and data-count the
//               edge's own), so the strip's hooks stay. THE CONNECTOR: the edge element is, or holds, an SVG `<path>` (React Flow draws edges as SVG) with a visible stroke
//               (not `none`, wider than nothing, not near-transparent; a transparent hit-area path beside it is not it): the first visible one is the line a person sees.
//               It starts where the data's route starts and ends where the route ends (`laid.edges[].points`: first and last point, at the one scale and the one origin
//               the nodes are drawn at, to 2.5 px), so an edge drawn as text with no line, or a line to somewhere else, is refused. SVG elements have no `innerText`: an
//               edge's (or a node's) text is its visible text nodes, so a label in an SVG `<text>` counts as it does in HTML
//               GENERATED CONTENT IS TEXT: the `::before` and `::after` content (unquoted; `none`, `normal` and blanks write nothing) of every visible element in the
//               graph, a node's own, its children's and a sibling's, is read as text and goes where a text node does: a state's text, the "no digit outside a move"
//               rule, an edge's text. So a count painted by CSS (`i::after{content:"2×"}` inside a state, `b::after` beside one) is refused as a typed one is.
//               THE LABEL: an edge's own text, with its count taken out (digits, `×`, an `x` stuck to a digit) and its spaces, is its label, or its label and its note
//               (either order, as `laid.edges[]` has them): not another edge's label, not all of the graph's labels. And the label's box (the box round its text) lies
//               within LABEL_SLACK = 24 px of the line a person sees for the edge (sampled every 4 px along it). Why 24: React Flow's label renderer centres the label on
//               the midpoint of the curve it draws, so the box holds a point of the line (gap 0); 24 px (about two lines of 11px text) lets a label stand beside its
//               line, and a label at a corner or on another edge's far side is refused. Only an edge's two ENDS are compared with the data's route (above): React Flow
//               draws its own curve between them, so the label is measured against the curve drawn, not against the data's polyline (a polyline's midpoint is not
//               the bezier's). Known limit: a label drawn on a different edge that runs within 24 px of its own passes the position test (its text must still be its own).
//               WHERE THE LABEL IS DRAWN: inside the edge's own element, as `BaseEdge`'s `label` prop draws it. React Flow's `EdgeLabelRenderer` portals a label OUTSIDE
//               the edge's `<g>` (into the viewport's label layer), so this judge does not find it as the edge's text and says the edge does not say its label; use `BaseEdge`'s
//               `label`, not `EdgeLabelRenderer` (whether to judge portalled labels is in design/later.md).
//               WHAT A PERSON SEES: hidden means `hidden`, `display:none`, `visibility:hidden`, near-transparent, or no size. `aria-hidden` is NOT hidden: it only hides an
//               element from a screen reader, a sighted person still sees it, so a count in an `aria-hidden` element is refused like any other.
// NOT TRIED: deliberate obfuscation. A client that loads elk from a CDN, or writes its module name in pieces so no scan reads `elkjs`, is out of this check's
//   reach. The bundle scan in the seam half (every file under the built client, by content) and the Nx module boundaries (`elkjs` is the generator's, never the
//   portal's or portal-ui's) own those; a later review should not ask this judge to.
// Routes and lighting: `/portal/map`, `/portal/worlds`, and `/portal/things/<thing>` whose `lifecycle` holds the thing's machine graph (so checks 21 and 28
// keep reading `lifecycle`); `?lighting=structure|live|trace` picks the lighting (default: live when the portal has `live`, else structure) and
// `&journey=<journey file name, no folder or .ts>` names the trace's journey. The map and the worlds are always structure.
import type { Laid } from "./graph-expect.ts";
import type { ServedPortal } from "../served-portal/types.ts";

const SCAN = `(() => {
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) && !e.closest('[hidden]');
  const q = (s, from = document) => [...from.querySelectorAll(s)].filter(vis);
  const a = (e, n) => e.getAttribute(n);
  const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; };
  const opacity = (e) => { let o = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
  // Generated content of one element, unquoted: what \`::before\` and \`::after\` write (none, normal and an empty string write nothing).
  const content = (e) => ["::before", "::after"].map((p) => getComputedStyle(e, p).content).filter((c) => c !== "none" && c !== "normal").map((c) => c.replace(/^"([\\s\\S]*)"$/, "$1")).filter((c) => c.trim() !== "");
  // The generated content of an element and of every visible element in it (a CSS count on a child or a sibling is a count a person reads).
  const pseudos = (e, skip) => [e, ...e.querySelectorAll("*")].filter((x) => !(skip && x.closest(skip)) && vis(x)).flatMap(content);
  // The text a person sees in an element, HTML or SVG: SVG elements have no innerText, so their visible text nodes are read one by one; generated content is text too.
  const words = (e, skip) => { const out = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n !== null; n = w.nextNode()) { const p = n.parentElement; if (p !== null && vis(p) && n.data.trim() !== "" && !(skip && p.closest(skip))) out.push(n.data.trim()); } return [...out, ...pseudos(e, skip)]; };
  const txt = (e) => (e instanceof HTMLElement ? [e.innerText.trim(), ...pseudos(e, "")].filter((t) => t !== "").join(" ") : words(e, "").join(" "));
  // Where the text of an element is on the screen: the box round its visible text nodes (null when it has none).
  const textBox = (e) => { let l = Infinity, t = Infinity, rt = -Infinity, bt = -Infinity; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n !== null; n = w.nextNode()) { const p = n.parentElement; if (p === null || !vis(p) || n.data.trim() === "") continue; const g = document.createRange(); g.selectNodeContents(n); for (const b of g.getClientRects()) { l = Math.min(l, b.left); t = Math.min(t, b.top); rt = Math.max(rt, b.right); bt = Math.max(bt, b.bottom); } } return l === Infinity ? null : { l, t, w: rt - l, h: bt - t }; };
  // What a state may not carry anywhere in it, seen or not: a count below it, and a title or label with a number in it.
  const marks = (e) => [e, ...e.querySelectorAll("*")].flatMap((x) => [...(x !== e && a(x, "data-count") !== null && a(x, "data-count") !== "" ? ["data-count=" + a(x, "data-count")] : []), ...["title", "aria-label", "aria-description", "aria-valuetext"].flatMap((n) => (a(x, n) === null ? [] : [n + "=" + a(x, n)])), ...[...x.children].filter((c) => c.localName === "title").map((c) => "title=" + c.textContent)]);
  // The line a person sees for an edge, as screen points: the first path with a visible stroke, from its start to its end.
  const line = (e) => {
    const paths = [...(e.localName === "path" ? [e] : []), ...e.querySelectorAll("path")];
    const shown = paths.filter((p) => { if (!(p instanceof SVGGeometryElement) || !vis(p)) return false; const c = getComputedStyle(p); return c.stroke !== "none" && parseFloat(c.strokeWidth) > 0 && parseFloat(c.strokeOpacity) * opacity(p) >= 0.5 && p.getTotalLength() > 0; });
    const p = shown[0];
    if (p === undefined) return { paths: paths.length, shown: 0, start: null, end: null, pts: [] };
    const m = p.getScreenCTM(), len = p.getTotalLength(), at = (l) => { const pt = p.getPointAtLength(l); return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f }; };
    const n = Math.min(400, Math.max(2, Math.ceil(len / 4)));
    return { paths: paths.length, shown: shown.length, start: at(0), end: at(len), pts: Array.from({ length: n + 1 }, (_, i) => at(len * i / n)) };
  };
  const graph = (g) => ({
    graph: a(g, "data-graph"), mode: a(g, "data-mode"), width: a(g, "data-width"), height: a(g, "data-height"), rect: r(g),
    defaultBoxes: g.querySelectorAll('[class*="react-flow__node-default"],[class*="react-flow__node-input"],[class*="react-flow__node-output"]').length,
    nodes: q('[data-portal="graph-node"]', g).map((e) => ({ node: a(e, "data-node"), kind: a(e, "data-kind"), parent: a(e, "data-parent"), x: a(e, "data-x"), y: a(e, "data-y"), w: a(e, "data-w"), h: a(e, "data-h"), count: a(e, "data-count"), lit: a(e, "data-lit"), moved: a(e, "data-moved"), refused: a(e, "data-refused"), pseudo: content(e), marks: marks(e), opacity: opacity(e), text: txt(e), rect: r(e) })),
    edges: q('[data-portal="graph-edge"]', g).map((e) => ({ edge: a(e, "data-edge"), kind: a(e, "data-kind"), from: a(e, "data-from"), to: a(e, "data-to"), lit: a(e, "data-lit"), count: a(e, "data-count"), moved: a(e, "data-moved"), refused: a(e, "data-refused"), text: txt(e), box: textBox(e), opacity: opacity(e), line: line(e), move: (() => { const w = e.closest('[data-portal="move"]'); return w === null ? null : { move: a(w, "data-move"), lit: a(w, "data-lit"), count: a(w, "data-count") }; })() })),
    // Every piece of text a person can read in the graph that is not an edge's: a machine's graph may show no digit in it beyond a state's own name.
    outside: words(g, '[data-portal="graph-edge"],[data-portal="move"]'),
  });
  return {
    graphs: q('[data-portal="graph"]').map((g) => ({ ...graph(g), inLifecycle: g.closest('[data-portal="lifecycle"]') !== null })),
    lifecycles: q('[data-portal="lifecycle"]').length,
    status: a(document.querySelector('[data-portal="page"]') ?? document.body, "data-status"),
  };
})()`;

interface Rect { l: number; t: number; w: number; h: number }
interface Pt { x: number; y: number }
export interface SeenNode { node: string | null; kind: string | null; parent: string | null; x: string | null; y: string | null; w: string | null; h: string | null; count: string | null; lit: string | null; moved: string | null; refused: string | null; pseudo: Array<string>; marks: Array<string>; opacity: number; text: string; rect: Rect }
/** The line a person sees for an edge: how many paths the edge holds, how many have a visible stroke, and the first one's ends on the screen. */
export interface SeenLine { paths: number; shown: number; start: Pt | null; end: Pt | null; pts: Array<Pt> }
export interface SeenEdge { edge: string | null; kind: string | null; from: string | null; to: string | null; lit: string | null; count: string | null; moved: string | null; refused: string | null; text: string; box: Rect | null; opacity: number; line: SeenLine; move: { move: string | null; lit: string | null; count: string | null } | null }
export interface SeenGraph { graph: string | null; mode: string | null; width: string | null; height: string | null; rect: Rect; defaultBoxes: number; nodes: Array<SeenNode>; edges: Array<SeenEdge>; outside: Array<string>; inLifecycle: boolean }
export interface Seen { graphs: Array<SeenGraph>; lifecycles: number; status: string | null }

export const scan = (portal: ServedPortal, route: string) => portal.evaluate<Seen>(route, SCAN);

const abs = (n: { x: number; y: number; parent?: string; id: string }, by: Map<string, { x: number; y: number; parent?: string; id: string }>) => {
  let x = n.x, y = n.y;
  for (let p = n.parent === undefined ? undefined : by.get(n.parent), g = 0; p !== undefined && g < 50; p = p.parent === undefined ? undefined : by.get(p.parent), g++) { x += p.x; y += p.y; }
  return { x, y };
};
const MIN_SCALE = 0.3, MIN_OPACITY = 0.5, LINE_SLACK = 2.5, LABEL_SLACK = 24;
/** A text with its count taken out (digits, `×`, an `x` stuck to a digit) and its spaces: what is left is the words. */
const bare = (text: string | undefined) => (text ?? "").replace(/(?<=[0-9])x\b|\bx(?=[0-9])|[0-9×]/g, "").replace(/\s+/g, "");
const gapTo = (p: Pt, b: Rect) => Math.hypot(Math.max(b.l - p.x, 0, p.x - (b.l + b.w)), Math.max(b.t - p.y, 0, p.y - (b.t + b.h)));
const meets = (a: Rect, b: Rect) => a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;

/** What a state must not show, in any lighting: a count, a lit mark, a trace mark, generated content. */
const stateProblems = (what: string, label: string, d: SeenNode): ReadonlyArray<string> => [
  ...(d.text.replace(label, "").trim() === "" ? [] : [`${what}: state "${label}" shows "${d.text.replace(label, "").trim()}" besides its name: a state shows no count`]),
  ...(d.count === null || d.count === "" ? [] : [`${what}: state "${label}" carries a count (${d.count})`]),
  ...(d.lit === null || d.lit === "false" ? [] : [`${what}: state "${label}" is lit (data-lit ${d.lit}): lighting is on moves`]),
  ...((d.moved ?? "") === "" && (d.refused ?? "") === "" ? [] : [`${what}: state "${label}" carries a trace mark: lighting is on moves`]),
  ...(d.pseudo.length === 0 ? [] : [`${what}: state "${label}" has generated content (${d.pseudo.join(" ")}) besides its name`]),
  // Seen or not: a count below it, a title or label (anywhere in it) with a number besides its name.
  ...d.marks.filter((m) => m.startsWith("data-count=")).map((m) => `${what}: state "${label}" holds a count in it (${m}), seen or not`),
  ...d.marks.filter((m) => !m.startsWith("data-count=") && /[0-9]/.test(m.slice(m.indexOf("=") + 1).replace(label, ""))).map((m) => `${what}: state "${label}" has a number in its ${m.slice(0, m.indexOf("="))} (${m.slice(m.indexOf("=") + 1)}): a state shows no count`),
];

const digits = (text: string, labels: ReadonlyArray<string>) => [...labels].sort((a, b) => b.length - a.length).reduce((t, l) => (l === "" ? t : t.split(l).join(" ")), text);

/**
 * The page's graph against the laid graph the portal was given: drawn once, every node and edge of it and nothing else, each with the laid numbers
 * and ids, no default React Flow box, nothing faded or clipped away, and on the screen where the data puts it (one scale for the whole graph, every node at its
 * laid offset times that scale: a client that laid the graph out itself, or moved a node, is told).
 */
export const drawnProblems = (what: string, seen: SeenGraph | undefined, laid: Laid | undefined): ReadonlyArray<string> => {
  if (seen === undefined) return [`${what}: the page draws no \`graph\` for it`];
  if (laid === undefined) return [`${what}: the portal's data has no such graph to draw`];
  const out: Array<string> = [];
  if (seen.defaultBoxes > 0) out.push(`${what}: ${String(seen.defaultBoxes)} nodes are React Flow's default boxes, not our components`);
  if (seen.width !== String(laid.width) || seen.height !== String(laid.height)) out.push(`${what}: the graph says ${String(seen.width)} by ${String(seen.height)}, the data ${String(laid.width)} by ${String(laid.height)}`);
  if (seen.rect.w <= 0 || seen.rect.h <= 0) out.push(`${what}: the graph has no size on the screen`);
  const have = new Map<string, Array<SeenNode>>();
  for (const n of seen.nodes) have.set(n.node ?? "", [...(have.get(n.node ?? "") ?? []), n]);
  for (const n of laid.nodes) {
    const drawn = have.get(n.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: node "${n.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (d.kind !== n.kind || (d.parent ?? "") !== (n.parent ?? "")) out.push(`${what}: node "${n.id}" is drawn as ${String(d.kind)} in "${String(d.parent)}", the data says ${n.kind} in "${n.parent ?? ""}"`);
    if ([d.x, d.y, d.w, d.h].join() !== [n.x, n.y, n.w, n.h].map(String).join()) out.push(`${what}: node "${n.id}" carries ${[d.x, d.y, d.w, d.h].join(",")}, the data has ${[n.x, n.y, n.w, n.h].join(",")}`);
    if (!d.text.includes(n.label)) out.push(`${what}: node "${n.id}" does not say "${n.label}"`);
    if (d.rect.w <= 0 || d.rect.h <= 0) out.push(`${what}: node "${n.id}" has no size on the screen`);
    if (d.opacity < MIN_OPACITY) out.push(`${what}: node "${n.id}" is faded to ${d.opacity.toFixed(2)}`);
    else if (d.rect.w > 0 && d.rect.h > 0 && !meets(d.rect, seen.rect)) out.push(`${what}: node "${n.id}" is outside the graph's own box on the screen`);
    if (n.kind === "state") out.push(...stateProblems(what, n.label, d));
  }
  for (const id of have.keys()) if (!laid.nodes.some((n) => n.id === id)) out.push(`${what}: the page draws node "${id}", the data has none`);
  // A machine's graph shows a digit nowhere but on a move edge: what is left of its text once the nodes' own names are taken out has none (`2`, `2x`, `x2`, `2 moves`).
  const leftOver = seen.outside.map((t) => digits(t, laid.nodes.map((n) => n.label))).filter((t) => /[0-9]/.test(t));
  if (seen.graph?.startsWith("machine:") === true && leftOver.length > 0) out.push(`${what}: ${leftOver.length} numbers (${leftOver.join(", ")}) show in the graph outside a move: counts are on moves only`);
  const eh = new Map<string, Array<SeenEdge>>();
  for (const e of seen.edges) eh.set(e.edge ?? "", [...(eh.get(e.edge ?? "") ?? []), e]);
  for (const e of laid.edges) {
    const drawn = eh.get(e.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: edge "${e.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (e.kind === "move" && (d.move === null || d.move.move !== e.label || d.move.lit !== d.lit || (d.move.count ?? "") !== (d.count ?? ""))) out.push(`${what}: edge "${e.id}" is not inside the \`move\` of its label "${e.label ?? ""}" (data-move, data-lit, data-count as the edge's own): check 21 reads the arrows there`);
    if (d.kind !== e.kind || d.from !== e.from || d.to !== e.to) out.push(`${what}: edge "${e.id}" is drawn ${String(d.kind)} ${String(d.from)} to ${String(d.to)}, the data says ${e.kind} ${e.from} to ${e.to}`);
    const text = bare(d.text), own = [bare(e.label), bare(e.label) + bare(e.note), bare(e.note) + bare(e.label)];
    if (e.label !== undefined && !text.includes(bare(e.label))) out.push(`${what}: edge "${e.id}" does not say its label "${e.label}"`);
    else if (!own.includes(text)) out.push(`${what}: edge "${e.id}" says "${d.text}", more than its own label "${e.label ?? ""}"${e.note === undefined ? "" : ` and note "${e.note}"`} (count digits and \`×\` aside): a label of another edge, or all of them, is not this edge's`);
    // The label sits on the line it labels: its box within LABEL_SLACK px of the line a person sees (React Flow puts its centre on the curve's midpoint, so the gap is 0 there).
    if (d.box !== null && d.line.pts.length > 0) { const gap = Math.min(...d.line.pts.map((p) => gapTo(p, d.box!))); if (gap > LABEL_SLACK) out.push(`${what}: edge "${e.id}" has its label ${gap.toFixed(0)} px from its line, over the ${String(LABEL_SLACK)} px a label may sit off it`); }
    if (d.opacity < MIN_OPACITY) out.push(`${what}: edge "${e.id}" is faded to ${d.opacity.toFixed(2)}`);
  }
  for (const id of eh.keys()) if (!laid.edges.some((e) => e.id === id)) out.push(`${what}: the page draws edge "${id}", the data has none`);
  // Where they sit: one scale, every node at its laid offset from the first, to a pixel and a half.
  const by = new Map(laid.nodes.map((n) => [n.id, n]));
  const drawnNodes = laid.nodes.flatMap((n) => { const d = have.get(n.id)?.[0]; return d === undefined || have.get(n.id)!.length !== 1 || d.rect.w <= 0 || d.rect.h <= 0 || n.w <= 0 || n.h <= 0 ? [] : [{ n, d, at: abs(n, by) }]; });
  const first = drawnNodes[0];
  if (first !== undefined) {
    const s = first.d.rect.w / first.n.w;
    if (s < MIN_SCALE) out.push(`${what}: the graph is drawn at ${s.toFixed(3)} of its size: under ${String(MIN_SCALE)} nobody can read it`);
    for (const { n, d, at } of drawnNodes) {
      const ds = d.rect.w / n.w, dh = d.rect.h / n.h;
      if (Math.abs(ds - s) > 0.01 * s || Math.abs(dh - s) > 0.01 * s) out.push(`${what}: node "${n.id}" is drawn at ${ds.toFixed(3)} by ${dh.toFixed(3)} of its size and the first at ${s.toFixed(3)}: the graph is not one picture`);
      const dx = d.rect.l - first.d.rect.l - (at.x - first.at.x) * s, dy = d.rect.t - first.d.rect.t - (at.y - first.at.y) * s;
      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) out.push(`${what}: node "${n.id}" is on the screen ${dx.toFixed(1)} by ${dy.toFixed(1)} px away from where the data puts it`);
    }
    // The connectors: the line each edge draws starts and ends where the data's route does, at the same scale and from the same origin as the nodes.
    const ox = first.d.rect.l - first.at.x * s, oy = first.d.rect.t - first.at.y * s;
    for (const e of laid.edges) {
      const drawn = eh.get(e.id);
      if (drawn === undefined || drawn.length !== 1) continue;
      const line = drawn[0]!.line, route = e.points;
      if (line.shown === 0 || line.start === null || line.end === null) { out.push(`${what}: edge "${e.id}" draws no line: ${String(line.paths)} paths in it, none with a visible stroke (an edge is a line, not just its text)`); continue; }
      if (!Array.isArray(route) || route.length < 2) continue;
      const from = route[0]!, to = route[route.length - 1]!;
      const ex = [[ox + from.x * s, oy + from.y * s], [ox + to.x * s, oy + to.y * s]] as const;
      const got = [line.start, line.end] as const;
      if (got.some((p, i) => Math.abs(p.x - ex[i]![0]) > LINE_SLACK || Math.abs(p.y - ex[i]![1]) > LINE_SLACK)) out.push(`${what}: edge "${e.id}" is drawn from (${got[0].x.toFixed(1)}, ${got[0].y.toFixed(1)}) to (${got[1].x.toFixed(1)}, ${got[1].y.toFixed(1)}) on the screen, the data's route runs from (${ex[0][0].toFixed(1)}, ${ex[0][1].toFixed(1)}) to (${ex[1][0].toFixed(1)}, ${ex[1][1].toFixed(1)}): the line is not where the data routes it`);
    }
  }
  return out;
};
