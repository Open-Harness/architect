// Check 40's stand-in client: a page that draws the graphs the portal's data carries, with the hooks graph-page.ts reads, so the judge can be shown a
// portal that does what M1.50 says (and refused one that does not: the controls change one line of this page at a time). It is not the portal, which only
// CI can build (it needs HeroUI Pro). It reads `/_portal/v1/blueprint` (the wire, with `graphs`) and `/_portal/v1/moves` (the live counts, its own stub);
// the lighting logic is written here a second time, from the contract in graph-light.ts, so the oracle is not just echoed back.
import type { PortalServerModule } from "../served-portal/types.ts";

const SCALE = 0.8;

const BODY = `
const SCALE = ${String(SCALE)};
const DOOR = ["NotAllowed", "InvalidPayload", "IdempotencyConflict"];
const params = new URLSearchParams(location.search);
const [, kind, name] = (location.pathname.replace(/^\\/portal/, "") || "/").split("/");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
Promise.all([fetch("/_portal/v1/blueprint").then((x) => x.json()), fetch("/_portal/v1/moves").then((x) => x.json())]).then(([b, live]) => {
  const m = b.model;
  const traceOf = (thing, file) => {
    const out = {};
    for (const k of Object.keys(m.things[thing].machine.moves)) out[k] = { moved: [], refused: [] };
    const j = Object.entries(m.journeys).find(([f]) => f.split("/").pop().replace(/\\.ts$/, "") === file)?.[1];
    (j ? j.steps : []).forEach((s, i) => {
      if (s.call === undefined) return;
      const op = m.operations[s.call.operation];
      if (op.thing !== thing || !op.move) return;
      if (s.checks.some((c) => c.kind === "emits")) out[op.move.key].moved.push(i + 1);
      for (const c of s.checks) if (c.kind === "refuses" && !DOOR.includes(c.error)) out[op.move.key].refused.push((i + 1) + ":" + c.error);
    });
    return out;
  };
  const draw = (id, thing) => {
    const g = id === "map" ? b.graphs.map : id === "worlds" ? b.graphs.worlds : b.graphs.machines[thing];
    const mode = !thing ? "structure" : params.get("lighting") ?? (live === null ? "structure" : "live");
    const trace = mode === "trace" && thing ? traceOf(thing, params.get("journey")) : {};
    const box = (n) => '<div data-portal="graph-node" data-node="' + n.id + '" data-kind="' + n.kind + '" data-parent="' + (n.parent ?? "") + '" data-x="' + n.x + '" data-y="' + n.y + '" data-w="' + n.w + '" data-h="' + n.h + '" style="position:absolute;left:' + n.x * SCALE + 'px;top:' + n.y * SCALE + 'px;width:' + n.w * SCALE + 'px;height:' + n.h * SCALE + 'px;outline:1px solid #999;font:11px sans-serif">' + esc(n.label) + g.nodes.filter((c) => c.parent === n.id).map(box).join("") + "</div>";
    const edge = (e) => {
      const l = e.label ?? "", t = trace[l] ?? { moved: [], refused: [] }, n = live ? (live[thing + "." + l] ?? 0) : 0;
      const lit = mode === "live" ? n > 0 : mode === "trace" ? t.moved.length + t.refused.length > 0 : false;
      const wrap = (inner) => e.kind === "move" ? '<span data-portal="move" data-move="' + l + '" data-lit="' + lit + '" data-count="' + (mode === "live" ? n : "") + '">' + inner + "</span>" : inner;
      return wrap('<svg width="' + g.width * SCALE + '" height="' + g.height * SCALE + '" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none"><g data-portal="graph-edge" data-edge="' + e.id + '" data-kind="' + e.kind + '" data-from="' + e.from + '" data-to="' + e.to + '" data-lit="' + lit + '" data-count="' + (mode === "live" && e.kind === "move" ? n : "") + '" data-moved="' + (mode === "trace" ? t.moved.join(",") : "") + '" data-refused="' + (mode === "trace" ? t.refused.join(",") : "") + '"><path d="M ' + e.points.map((p) => p.x * SCALE + " " + p.y * SCALE).join(" L ") + '" fill="none" stroke="#333" stroke-width="1.5"/><text x="' + e.points[0].x * SCALE + '" y="' + e.points[0].y * SCALE + '" font-size="10">' + esc(e.label ?? "") + "</text></g></svg>");
    };
    return '<div data-portal="graph" data-graph="' + id + '" data-mode="' + mode + '" data-width="' + g.width + '" data-height="' + g.height + '" style="position:relative;width:' + g.width * SCALE + 'px;height:' + g.height * SCALE + 'px;margin:30px">'
      + g.nodes.filter((n) => !n.parent).map(box).join("") + g.edges.map(edge).join("") + "</div>";
  };
  let body = "<p>home</p>", status = 200;
  if (kind === "map") body = draw("map");
  else if (kind === "worlds") body = draw("worlds");
  else if (kind === "things" && m.things[name]) {
    const t = m.things[name];
    body = "<h1>" + name + "</h1>" + (t.machine ? '<div data-portal="lifecycle" data-thing="' + name + '" data-states="' + t.machine.states.join(",") + '">' + draw("machine:" + name, name) + "</div>" : "");
  } else if (kind !== undefined) { body = "<p>not found</p>"; status = 404; }
  document.getElementById("root").innerHTML = '<main data-portal="page" data-ready="true" data-status="' + status + '">' + body + "</main>";
});`;

export const standIn = (): string => `<!doctype html><html><head><meta charset="utf-8"><title>stand-in</title></head><body style="margin:0"><div id="root"></div><script>${BODY}</script></body></html>`;

/** The stand-in's server half: the wire as given and the live counts (null: a portal with no `live`). */
export const standInServer: PortalServerModule = {
  PortalServer: {
    handle: (context, request) => {
      const { blueprint, counts } = context as { blueprint: unknown; counts: unknown };
      const path = new URL(request.url).pathname;
      return Promise.resolve(path === "/_portal/v1/blueprint" ? Response.json(blueprint) : path === "/_portal/v1/moves" ? Response.json(counts ?? null) : new Response("no", { status: 404 }));
    },
  },
};
export const run = (effect: unknown) => effect as Promise<Response>;
