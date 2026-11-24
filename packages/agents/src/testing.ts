// The agents' probes' handlers (GOAL17-check-harness, calls 1 and 5): what a journey may ask of an agent's own actor. They are registered by the world's own entry
// (`generated/server/world.ts`) and by nothing else: no production Worker reaches this file, and a journey imports only the descriptors (`./probes.ts`).
// A world's front door gives each handler the request and the world's actors; it answers JSON.

/** What a probe is given of the world: the Durable Objects things that live as actors are kept in. */
export interface ProbeWorld {
  /** The actors' Durable Object namespace, as far as a probe needs it (structural: this package takes no dependency on the Workers types). */
  readonly actors?: { readonly get: (id: any) => unknown; readonly idFromName: (name: string) => any };
  readonly actorTables?: ReadonlyArray<string>;
}

export type ProbeHandler = (request: Request, world: ProbeWorld) => Promise<Response>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Found { readonly row: Readonly<Record<string, unknown>>; readonly state: string | null; readonly version: number }

/** An agent's row, as its own Durable Object keeps it, or nothing. */
const found = (world: ProbeWorld, agent: string): Promise<Found | null> => {
  const stub = world.actors?.get(world.actors.idFromName(`agent:${agent}`)) as { find(): Promise<Found | null> } | undefined;
  return stub === undefined ? Promise.resolve(null) : stub.find();
};

const told: ProbeHandler = (request, world) => {
  const query = new URL(request.url).searchParams;
  const agent = query.get("agent") ?? "";
  const only = query.get("requestId");
  return found(world, agent).then((held) => {
    if (held === null) return json({ error: `no agent ${agent}` }, 404);
    // An actor keeps a list field as it travels: JSON text, or the list itself.
    const kept = held.row["told"];
    const all = (typeof kept === "string" ? JSON.parse(kept) : kept ?? []) as ReadonlyArray<{ readonly requestId: string }>;
    return json({ inputs: only === null ? all : all.filter((t) => t.requestId === only) });
  });
};

/** An agent's committed model steps are its Pi conversation's, answered by its actor: one for each stored model response, numbered from 1 in the run that follows its input. */
const calls: ProbeHandler = (request, world) => {
  const query = new URL(request.url).searchParams;
  const stub = world.actors?.get(world.actors.idFromName(`agent:${query.get("agent") ?? ""}`)) as { steps(): Promise<ReadonlyArray<{ readonly requestId: string }>> } | undefined;
  if (stub === undefined) return Promise.resolve(json({ error: "this world has no agents' actors" }, 404));
  const only = query.get("requestId");
  return stub.steps().then((steps) => json({ steps: only === null ? steps : steps.filter((s) => s.requestId === only) }));
};

/** The probes this package answers, by the route under `/_world/` their descriptors name. */
export const probes: Readonly<Record<string, ProbeHandler>> = {
  "probe/agent/told": told,
  "probe/agent/calls": calls,
};
