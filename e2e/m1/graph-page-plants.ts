// The wrong pages check 40's controls plant (author skill, proof 5): the stand-in client (graph-standin.ts) with ONE line changed, the routes where the fault
// shows, and what the judge must say. `from` is quoted from the stand-in; a control fails loudly if the stand-in no longer holds it.
export interface PagePlant { readonly name: string; readonly from: string; readonly to: string; readonly routes: ReadonlyArray<string>; readonly says: string; readonly model?: "invalid-payload" | "plugins" }

const MAP = "/portal/map", WORLDS = "/portal/worlds";
const STRUCT = "/portal/things/handle?lighting=structure";
const LIVE = "/portal/things/link?lighting=live";
const LIVE_H = "/portal/things/handle?lighting=live";
const TRACE_L = "/portal/things/link?lighting=trace&journey=add-order-and-remove-a-link";
const TRACE_H = "/portal/things/handle?lighting=trace&journey=release-a-handle";
const STORY = "/portal/things/link?lighting=trace&journey=the-story";
const STRANGER = "/portal/things/link?lighting=trace&journey=a-stranger-cannot-edit-a-page";
const PROFILE = "/portal/things/profile";
const ROOT = "g.nodes.filter((n) => !n.parent).map(box).join(\"\")";

export const PAGE: ReadonlyArray<PagePlant> = [
  // nodes: left out, added, repeated, wrong
  { name: "a root node drawn twice", from: ROOT, to: "g.nodes.filter((n) => !n.parent).concat(g.nodes.filter((n) => !n.parent)).map(box).join(\"\")", routes: [STRUCT, WORLDS], says: "is drawn 2 times" },
  { name: "a node left out", from: ROOT, to: "g.nodes.filter((n) => !n.parent && n.label !== \"released\" && n.kind !== \"journey\").map(box).join(\"\")", routes: [STRUCT, WORLDS], says: "is drawn 0 times" },
  { name: "a node the data does not have", from: "+ g.edges.map(edge).join(\"\") + \"</div>\";", to: "+ g.edges.map(edge).join(\"\") + '<div data-portal=\"graph-node\" data-node=\"ghost\" data-kind=\"thing\" data-parent=\"\" data-x=\"0\" data-y=\"0\" data-w=\"10\" data-h=\"10\">ghost</div></div>';", routes: [MAP], says: "draws node \"ghost\"" },
  { name: "a node of another kind", from: "'\" data-kind=\"' + n.kind + '\" data-parent=\"'", to: "'\" data-kind=\"' + (n.kind === \"state\" ? \"world\" : n.kind) + '\" data-parent=\"'", routes: [STRUCT], says: "is drawn as world" },
  { name: "a node whose parent the page forgets", from: "(n.parent ?? \"\")", to: "\"\"", routes: [MAP], says: "is drawn as thing in \"\"" },
  { name: "an x that is not the data's, on states only", from: "'\" data-x=\"' + n.x + '\"", to: "'\" data-x=\"' + (n.kind === \"state\" ? n.x + 1 : n.x) + '\"", routes: [STRUCT, MAP], says: "carries" },
  { name: "a size that is not the data's, on journeys only", from: "data-w=\"' + n.w + '\"", to: "data-w=\"' + (n.kind === \"journey\" ? n.w + 1 : n.w) + '\"", routes: [WORLDS], says: "carries" },
  { name: "a node that does not say its name", from: "+ esc(n.label) + g.nodes", to: "+ (n.kind === \"world\" ? \"\" : esc(n.label)) + g.nodes", routes: [WORLDS], says: "does not say" },
  // no count on a state
  { name: "a state that shows a count in its text", from: "+ esc(n.label) + g.nodes", to: "+ esc(n.label) + (n.kind === \"state\" ? \" x\" + (live ? 3 : 0) : \"\") + g.nodes", routes: [LIVE, STRUCT], says: "a state shows no count" },
  { name: "a state that carries a count attribute", from: "'\" style=\"position:absolute;left:' + n.x * SCALE", to: "'\"' + (n.kind === \"state\" ? ' data-count=\"2\"' : \"\") + ' style=\"position:absolute;left:' + n.x * SCALE", routes: [LIVE], says: "carries a count" },
  // where they are on the screen
  { name: "a client that moves some nodes itself", from: "left:' + n.x * SCALE + 'px;top:'", to: "left:' + (n.x * SCALE + (n.kind === \"state\" ? 15 : 0)) + 'px;top:'", routes: [STRUCT], says: "away from where the data puts it" },
  { name: "a client that lays one kind out again, in a group", from: "top:' + n.y * SCALE", to: "top:' + (n.kind === \"thing\" ? 3 : n.y) * SCALE", routes: [MAP], says: "away from where the data puts it" },
  { name: "a node drawn at another scale", from: "'px;width:' + n.w * SCALE", to: "'px;width:' + n.w * SCALE * (n.kind === \"state\" ? 2 : 1)", routes: [STRUCT], says: "of its size" },
  { name: "nodes that move when the lighting changes (on the screen)", from: "left:' + n.x * SCALE + 'px;top:'", to: "left:' + (n.x + (mode === \"live\" && n.kind === \"state\" ? 40 : 0)) * SCALE + 'px;top:'", routes: [LIVE], says: "away from where the data puts it" },
  // components, not default boxes
  { name: "React Flow's default box", from: "const box = (n) => '<div data-portal=\"graph-node\"", to: "const box = (n) => '<div class=\"react-flow__node-default\" data-portal=\"graph-node\"", routes: [STRUCT], says: "default boxes" },
  // edges
  { name: "an edge drawn twice", from: "g.edges.map(edge).join(\"\") + \"</div>\"", to: "g.edges.concat(g.edges).map(edge).join(\"\") + \"</div>\"", routes: [STRUCT], says: "is drawn 2 times" },
  { name: "an edge left out", from: "+ g.edges.map(edge).join(\"\") + \"</div>\"", to: "+ g.edges.slice(1).map(edge).join(\"\") + \"</div>\"", routes: [STRUCT, MAP], says: "is drawn 0 times" },
  { name: "an edge drawn between the wrong nodes", from: "data-from=\"' + e.from + '\"", to: "data-from=\"' + e.to + '\"", routes: [MAP], says: "is drawn" },
  { name: "a move edge outside the `move` check 21 reads", from: 'const wrap = (inner) => e.kind === "move" ?', to: "const wrap = (inner) => false ?", routes: [STRUCT], says: "is not inside the `move`" },
  { name: "a move whose wrapper counts what the edge does not", from: 'data-count="\' + (mode === "live" ? n : "") + \'">\' + inner', to: 'data-count="\' + (mode === "live" ? n + 1 : "") + \'">\' + inner', routes: [LIVE], says: "is not inside the `move`" },
  // the graph itself
  { name: "a graph nobody can see", from: "'<div data-portal=\"graph\" data-graph=\"'", to: "'<div hidden data-portal=\"graph\" data-graph=\"'", routes: [STRUCT, MAP], says: "draws 0 graphs" },
  { name: "a graph outside the lifecycle", from: "'<div data-portal=\"lifecycle\" data-thing=\"'", to: "'<div data-thing=\"'", routes: [STRUCT], says: "not inside the thing's `lifecycle`" },
  { name: "two graphs on a thing's page", from: "+ draw(\"machine:\" + name, name) +", to: "+ draw(\"machine:\" + name, name) + draw(\"machine:\" + name, name) +", routes: [STRUCT], says: "draws 2 graphs" },
  { name: "a graph for a thing that has no machine", from: "+ \"</div>\" : \"\")", to: "+ \"</div>\" : '<div data-portal=\"lifecycle\" data-thing=\"' + name + '\">' + draw(\"map\") + \"</div>\")", routes: [PROFILE], says: "has no machine" },
  { name: "a graph that says its size wrong", from: "data-width=\"' + g.width + '\"", to: "data-width=\"' + (g.width + 1) + '\"", routes: [WORLDS], says: "the graph says" },
  // lighting
  { name: "a live count one too many", from: "n = live ? (live[thing + \".\" + l] ?? 0) : 0", to: "n = live ? (live[thing + \".\" + l] ?? 0) + 1 : 0", routes: [LIVE], says: "has count" },
  { name: "live counts read from the wrong thing", from: "live[thing + \".\" + l]", to: "live[\"link.\" + l]", routes: [LIVE_H], says: "has count" },
  { name: "live counts missing", from: "n = live ? (live[thing + \".\" + l] ?? 0) : 0", to: "n = 0", routes: [LIVE], says: "has count" },
  { name: "live lit for a move made zero times", from: "mode === \"live\" ? n > 0", to: "mode === \"live\" ? true", routes: [LIVE_H], says: "has lit" },
  { name: "structure that lights moves", from: ": false;\n      const wrap", to: ": true;\n      const wrap", routes: [STRUCT], says: "has lit true" },
  { name: "a lighting that says the wrong mode", from: "data-mode=\"' + mode + '\"", to: "data-mode=\"' + (mode === \"trace\" ? \"live\" : mode) + '\"", routes: [TRACE_L], says: "its lighting is live" },
  { name: "a trace that keeps a live count", from: "(mode === \"live\" && e.kind === \"move\" ? n : \"\")", to: "(e.kind === \"move\" ? n : \"\")", routes: [TRACE_L], says: "has count" },
  { name: "a trace that counts a refusal at the door", from: "!DOOR.includes(c.error)", to: "true", routes: [STRANGER], says: "has refused" },
  { name: "a trace that drops refusals", from: "if (c.kind === \"refuses\"", to: "if (false && c.kind === \"refuses\"", routes: [TRACE_L], says: "has refused" },
  { name: "a trace that numbers its steps from zero", from: "moved.push(i + 1)", to: "moved.push(i)", routes: [TRACE_L], says: "has moved" },
  { name: "a trace right for one move and wrong for the other", from: "if (s.checks.some((c) => c.kind === \"emits\"))", to: "if (op.move.key !== \"release\" && s.checks.some((c) => c.kind === \"emits\"))", routes: [TRACE_H], says: "has moved" },
  { name: "a trace of another journey", from: "=== file)?.[1]", to: "=== \"claim-a-handle\")?.[1]", routes: [TRACE_L], says: "has moved" },
  { name: "a trace that lights only the first move of a step it made twice", from: "out[op.move.key].moved.push(i + 1);", to: "if (out[op.move.key].moved.length === 0) out[op.move.key].moved.push(i + 1);", routes: [STORY], says: "has moved" },
  { name: "a trace that lights nothing in the data's lit", from: "t.moved.length + t.refused.length > 0", to: "t.moved.length > 0", routes: [STRANGER], says: "has lit" },
  { name: "nodes that move when the lighting changes (in the data)", from: "data-x=\"' + n.x + '\"", to: "data-x=\"' + (mode === \"live\" ? n.x + 3 : n.x) + '\"", routes: [LIVE], says: "carries" },
  // found by the hostile pass
  { name: "edges with no text", from: 'esc(e.label ?? "") + "</text></g></svg>")', to: '"" + "</text></g></svg>")', routes: [STRUCT, MAP], says: "does not say its label" },
  { name: "edges that say something else", from: 'esc(e.label ?? "") + "</text></g></svg>")', to: '"banana" + "</text></g></svg>")', routes: [WORLDS, MAP], says: "does not say its label" },
  { name: "nodes five times as tall as the data's", from: "'px;height:' + n.h * SCALE", to: "'px;height:' + n.h * SCALE * 5", routes: [STRUCT], says: "of its size" },
  { name: "a graph drawn as a speck", from: "const SCALE = 0.8;", to: "const SCALE = 0.1;", routes: [STRUCT], says: "nobody can read it" },
  { name: "a first node with no width", from: "'px;width:' + n.w * SCALE", to: "'px;width:' + (n.kind === \"start\" ? 0 : n.w * SCALE)", routes: [STRUCT], says: "has no size on the screen" },
  { name: "nodes faded to almost nothing", from: "outline:1px solid #999;font:11px sans-serif", to: "outline:1px solid #999;opacity:0.01;font:11px sans-serif", routes: [STRUCT], says: "is faded to" },
  { name: "a graph clipped to no height", from: "'px;margin:30px\">'", to: "'px;margin:30px;height:0;overflow:hidden\">'", routes: [STRUCT], says: "has no size on the screen" },
  { name: "a count beside each state, outside its text", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" && live ? \"<b>2</b>\" : \"\");", routes: [LIVE], says: "show in the graph outside a move" },
  { name: "a count with a multiplication sign beside each state: `2×`", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" && live ? \"<b>2×</b>\" : \"\");", routes: [LIVE], says: "show in the graph outside a move" },
  { name: "a count beside each state with the sign first: `x2`", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" && live ? \"<b>x2</b>\" : \"\");", routes: [LIVE], says: "show in the graph outside a move" },
  { name: "a count beside each state in words: `2 moves`, as a bare text node", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" && live ? \" 2 moves\" : \"\");", routes: [LIVE], says: "show in the graph outside a move" },
  { name: "a count beside each state, in structure lighting too", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" ? \"<b>2×</b>\" : \"\");", routes: [STRUCT], says: "show in the graph outside a move" },
  { name: "a count hidden inside each state (`data-count` on a hidden child)", from: "+ esc(n.label) + g.nodes", to: "+ esc(n.label) + (n.kind === \"state\" ? '<i hidden data-count=\"2\"></i>' : \"\") + g.nodes", routes: [LIVE], says: "holds a count in it" },
  { name: "a count in each state's title: `2 moves`", from: "'\" style=\"position:absolute;left:' + n.x * SCALE", to: "'\"' + (n.kind === \"state\" ? ' title=\"2 moves\"' : \"\") + ' style=\"position:absolute;left:' + n.x * SCALE", routes: [LIVE], says: "has a number in its title" },
  { name: "a count in each state's aria-label: `claimed, 2 moves`", from: "'\" style=\"position:absolute;left:' + n.x * SCALE", to: "'\"' + (n.kind === \"state\" ? ' aria-label=\"' + n.label + ', 2 moves\"' : \"\") + ' style=\"position:absolute;left:' + n.x * SCALE", routes: [LIVE], says: "has a number in its aria-label" },
  // the connectors (a line a person sees, from where the data's route starts to where it ends)
  { name: "edges drawn as text with no line (an element, not a path)", from: '"><path d="M ', to: '"><g d="M ', routes: [STRUCT, MAP], says: "draws no line" },
  { name: "edges whose line has no stroke", from: 'fill="none" stroke="#333" stroke-width="1.5"/>', to: 'fill="none" stroke="none" stroke-width="1.5"/>', routes: [STRUCT], says: "draws no line" },
  { name: "edges whose line is as wide as nothing", from: 'stroke="#333" stroke-width="1.5"/>', to: 'stroke="#333" stroke-width="0"/>', routes: [WORLDS], says: "draws no line" },
  { name: "edges whose line is all but transparent (a hit area, not a line)", from: 'stroke="#333" stroke-width="1.5"/>', to: 'stroke="#333" stroke-opacity="0.05" stroke-width="1.5"/>', routes: [MAP], says: "draws no line" },
  { name: "edges whose line is hidden", from: '"><path d="M ', to: '"><path hidden d="M ', routes: [STRUCT], says: "draws no line" },
  { name: "one edge with no line, the first of each graph", from: 'stroke="#333" stroke-width="1.5"/>', to: 'stroke="#333" stroke-width="\' + (e.id === g.edges[0].id ? 0 : 1.5) + \'"/>', routes: [STRUCT, MAP, WORLDS], says: "draws no line" },
  { name: "lines that run somewhere else: all shifted 20 px right", from: 'e.points.map((p) => p.x * SCALE + " " + p.y * SCALE)', to: 'e.points.map((p) => (p.x + 20) * SCALE + " " + p.y * SCALE)', routes: [STRUCT, MAP], says: "the line is not where the data routes it" },
  { name: "lines misrouted on one kind of edge only (map refs, 30 px down)", from: 'e.points.map((p) => p.x * SCALE + " " + p.y * SCALE)', to: 'e.points.map((p) => p.x * SCALE + " " + (p.y + (e.kind === "ref" ? 30 : 0)) * SCALE)', routes: [MAP], says: "the line is not where the data routes it" },
  { name: "lines that end short of their target: the last point dropped", from: 'e.points.map((p) => p.x * SCALE + " " + p.y * SCALE)', to: 'e.points.slice(0, -1).concat([{ x: e.points[0].x + 5, y: e.points[0].y + 5 }]).map((p) => p.x * SCALE + " " + p.y * SCALE)', routes: [STRUCT, WORLDS], says: "the line is not where the data routes it" },
  { name: "lines drawn the wrong way round: from the target to the source", from: 'e.points.map((p) => p.x * SCALE + " " + p.y * SCALE)', to: 'e.points.slice().reverse().map((p) => p.x * SCALE + " " + p.y * SCALE)', routes: [STRUCT, WORLDS], says: "the line is not where the data routes it" },
  { name: "lines drawn at another scale than the nodes", from: 'e.points.map((p) => p.x * SCALE + " " + p.y * SCALE)', to: 'e.points.map((p) => p.x * SCALE * 1.5 + " " + p.y * SCALE * 1.5)', routes: [STRUCT], says: "the line is not where the data routes it" },
  { name: "a trace that takes a refusal of `InvalidPayload` for a refusal of the move (the door list stops at two)", model: "invalid-payload", from: 'const DOOR = ["NotAllowed", "InvalidPayload", "IdempotencyConflict"];', to: 'const DOOR = ["NotAllowed", "IdempotencyConflict"];', routes: [STRANGER], says: "has refused" },
  { name: "a count on states by generated content", from: '<div id="root">', to: '<style>[data-kind=state]::after{content:"3"}</style><div id="root">', routes: [LIVE], says: "has generated content" },
  { name: "a state that is lit", from: "'\" style=\"position:absolute;left:' + n.x * SCALE", to: "'\"' + (n.kind === \"state\" ? ' data-lit=\"true\"' : \"\") + ' style=\"position:absolute;left:' + n.x * SCALE", routes: [TRACE_L], says: "is lit" },
  { name: "a state that carries a trace mark", from: "'\" style=\"position:absolute;left:' + n.x * SCALE", to: "'\"' + (n.kind === \"state\" ? ' data-moved=\"1\"' : \"\") + ' style=\"position:absolute;left:' + n.x * SCALE", routes: [TRACE_L], says: "carries a trace mark" },
  // found by the second review: a count made by CSS, and a label on the wrong edge or far from its own
  { name: "a count by `::after` on a child of each state: `<i>` inside, `i::after{content:\"2×\"}`", from: "+ esc(n.label) + g.nodes", to: "+ esc(n.label) + (n.kind === \"state\" ? '<style>[data-kind=state] i::after{content:\"2×\"}</style><i></i>' : \"\") + g.nodes", routes: [LIVE, STRUCT], says: "a state shows no count" },
  { name: "a count by `::after` on a sibling beside each state: `b::after{content:\"2×\"}`", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" ? '<style>b::after{content:\"2×\"}</style><b></b>' : \"\");", routes: [LIVE, STRUCT], says: "show in the graph outside a move" },
  { name: "a count by `::before` on a child of each state, in single quotes: `x2`", from: "+ esc(n.label) + g.nodes", to: "+ esc(n.label) + (n.kind === \"state\" ? \"<style>[data-kind=state] i::before{content:'x2'}</style><i></i>\" : \"\") + g.nodes", routes: [LIVE], says: "a state shows no count" },
  // found by the third review: `aria-hidden` hides from a screen reader, not from a person who sees
  { name: "a count beside each state in an `aria-hidden` element: `<b aria-hidden=\"true\">2×</b>`", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" ? '<b aria-hidden=\"true\">2×</b>' : \"\");", routes: [LIVE], says: "show in the graph outside a move" },
  { name: "a count by `::after` on an `aria-hidden` sibling beside each state: `i::after{content:\"2×\"}`", from: ".map(box).join(\"\") + \"</div>\";", to: ".map(box).join(\"\") + \"</div>\" + (n.kind === \"state\" ? '<style>i::after{content:\"2×\"}</style><i aria-hidden=\"true\"></i>' : \"\");", routes: [LIVE, STRUCT], says: "show in the graph outside a move" },
  { name: "every label on every edge: each edge's text holds all of the graph's labels", from: 'esc(e.label ?? "") + "</text></g></svg>")', to: 'g.edges.map((x) => esc(x.label ?? "")).join(" ") + "</text></g></svg>")', routes: [STRUCT, MAP], says: "more than its own label" },
  { name: "labels swapped between two edges (the first, and the first with another label)", from: 'esc(e.label ?? "") + "</text></g></svg>")', to: 'esc(((a) => { const b = g.edges.find((x) => x.label !== a.label) ?? a; return (e === a ? b : e === b ? a : e).label ?? ""; })(g.edges[0])) + "</text></g></svg>")', routes: [STRUCT, MAP], says: "does not say its label" },
  { name: "every label at a fixed corner, (5, 15)", from: '<text x="\' + e.points[0].x * SCALE + \'" y="\' + e.points[0].y * SCALE + \'" font-size="10">', to: '<text x="5" y="15" font-size="10">', routes: [STRUCT, MAP], says: "px from its line" },
  { name: "labels drawn 60 px from the line they label", from: '<text x="\' + e.points[0].x * SCALE + \'" y="\' + e.points[0].y * SCALE + \'" font-size="10">', to: '<text x="\' + (e.points[0].x * SCALE + 60) + \'" y="\' + (e.points[0].y * SCALE + 60) + \'" font-size="10">', routes: [STRUCT, MAP], says: "px from its line" },
  { name: "an edge that says its label and something else besides: `2x banana`", from: 'esc(e.label ?? "") + "</text></g></svg>")', to: 'esc(e.label ?? "") + " 2x banana</text></g></svg>")', routes: [LIVE_H], says: "more than its own label" },
  { name: "a map that drops its `mounts` edges (a plugin mounted: Plugged In with echo and greet)", model: "plugins", from: "g.edges.map(edge).join(\"\") + \"</div>\"", to: "g.edges.filter((e) => e.kind !== \"mounts\").map(edge).join(\"\") + \"</div>\"", routes: [MAP], says: "is drawn 0 times" },
];
