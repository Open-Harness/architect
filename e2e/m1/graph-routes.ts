// The pages check 40 opens, each with what it must draw: the map, the worlds, and a thing's page with its machine in `lifecycle` under one of the three lightings.
// `visitProblems` opens one route and says everything wrong with the graph on it.
import type { ServedPortal } from "../served-portal/types.ts";
import { machineThings, type GraphModel, type Graphs } from "./graph-expect.ts";
import { litProblems, type Lighting } from "./graph-lit.ts";
import { traceOf, type Live } from "./graph-light.ts";
import { drawnProblems, scan } from "./graph-page.ts";

export type Visit =
  | { readonly route: string; readonly view: "map" }
  | { readonly route: string; readonly view: "worlds" }
  | { readonly route: string; readonly view: "thing"; readonly thing: string; readonly lighting: Lighting | undefined };

const basename = (file: string) => file.split("/").pop()!.replace(/\.ts$/, "");
export const journeyName = basename;

export const mapVisit: Visit = { route: "/portal/map", view: "map" };
export const worldsVisit: Visit = { route: "/portal/worlds", view: "worlds" };
export const structureVisit = (thing: string): Visit => ({ route: `/portal/things/${thing}?lighting=structure`, view: "thing", thing, lighting: { mode: "structure" } });
export const liveVisit = (thing: string, live: Live): Visit => ({ route: `/portal/things/${thing}?lighting=live`, view: "thing", thing, lighting: { mode: "live", thing, counts: live.counts } });
export const traceVisit = (m: GraphModel, thing: string, journey: string): Visit => ({ route: `/portal/things/${thing}?lighting=trace&journey=${basename(journey)}`, view: "thing", thing, lighting: { mode: "trace", trace: traceOf(m, thing, journey) } });
/** A thing's page as it opens, with no lighting asked for: live when the portal has `live`. */
export const plainVisit = (thing: string, live: Live | undefined): Visit => ({ route: `/portal/things/${thing}`, view: "thing", thing, lighting: live === undefined ? { mode: "structure" } : { mode: "live", thing, counts: live.counts } });

/** Every page of a whole pass over a model: the map, the worlds, and each machine under structure, live, and a trace of every journey. */
export const allVisits = (m: GraphModel, live: Live): ReadonlyArray<Visit> => [
  mapVisit, worldsVisit,
  ...machineThings(m).flatMap((t) => [structureVisit(t), liveVisit(t, live), plainVisit(t, live), ...Object.keys(m.journeys).map((j) => traceVisit(m, t, j))]),
  ...Object.keys(m.things).filter((t) => !machineThings(m).includes(t)).map((t) => ({ route: `/portal/things/${t}`, view: "thing", thing: t, lighting: undefined }) as Visit),
];

export const visitProblems = async (portal: ServedPortal, graphs: Graphs | undefined, visit: Visit): Promise<ReadonlyArray<string>> => {
  const seen = await scan(portal, visit.route);
  const what = visit.route;
  if (seen.status !== "200") return [`${what}: the page's status is ${String(seen.status)}, not 200`];
  if (visit.view === "map" || visit.view === "worlds") {
    const own = seen.graphs.filter((g) => g.graph === visit.view);
    return [
      ...(seen.graphs.length === 1 && own.length === 1 ? [] : [`${what}: the page draws ${String(seen.graphs.length)} graphs (${seen.graphs.map((g) => g.graph).join(", ")}), it needs the one \`${visit.view}\``]),
      ...drawnProblems(what, own[0], graphs?.[visit.view]),
      ...litProblems(what, own[0], graphs?.[visit.view], { mode: "structure" }),
    ];
  }
  const laid = graphs?.machines?.[visit.thing];
  if (visit.lighting === undefined) return seen.graphs.length === 0 && seen.lifecycles === 0 ? [] : [`${what}: ${visit.thing} has no machine, and the page draws ${String(seen.graphs.length)} graphs and ${String(seen.lifecycles)} lifecycles`];
  const own = seen.graphs.filter((g) => g.graph === `machine:${visit.thing}`);
  return [
    ...(seen.graphs.length === 1 && own.length === 1 ? [] : [`${what}: the page draws ${String(seen.graphs.length)} graphs (${seen.graphs.map((g) => g.graph).join(", ")}), it needs the one \`machine:${visit.thing}\``]),
    ...(own[0] === undefined || own[0].inLifecycle ? [] : [`${what}: the machine's graph is not inside the thing's \`lifecycle\` (it replaces the strip there)`]),
    ...drawnProblems(what, own[0], laid),
    ...litProblems(what, own[0], laid, visit.lighting),
  ];
};

/** What a graph's nodes say about where they are, one line each: the numbers lighting must never move. */
export const placesOf = async (portal: ServedPortal, route: string) => (await scan(portal, route)).graphs.flatMap((g) => g.nodes.map((n) => `${String(n.node)}@${String(n.x)},${String(n.y)},${String(n.w)},${String(n.h)}`)).sort();
