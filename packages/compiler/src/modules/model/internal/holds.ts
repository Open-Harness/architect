// Holds and deliveries (GOAL17-pause): what an app's `held` and `unheld` lists say, and the refusals that keep them whole.
import type { Event, Field, Operation, Read, Thing, Value } from "orthograph";
import type { ThingModel } from "../types.ts";
import type { Layout } from "./layout.ts";

/** One delivery the blueprint declares: an event, and the operation an outbox hop calls for it. */
export interface Delivery {
  readonly event: Event;
  readonly to: Operation | Read;
}

/** Every `on:` of an operation, and every `on` verb of a feature mount. */
export const deliveriesOf = (layout: Layout): ReadonlyArray<Delivery> => [
  ...[...layout.things.values()].flatMap((t) => [...t.verbs.values()].flatMap(({ declaration: d }) => (d.kind === "operation" ? d.on.map((h) => ({ event: h.event, to: d as Operation | Read })) : []))),
  ...[...layout.mounts.values()].flatMap((m) => m.mount.verbs.flatMap((v) => (v.verb === "on" ? [{ event: v.hop.event, to: v.operation }] : []))),
];

export interface HoldContext {
  readonly layout: Layout;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly eventNames: ReadonlyMap<Event, string>;
  readonly opName: (declaration: unknown) => string | undefined;
  readonly problems: Array<string>;
}

const idPrefix = (input: Field | Value): string | undefined => {
  const meta = (input.kind === "field" ? input.value : input).meta;
  return meta.type === "id" ? meta.prefix : undefined;
};

/** Whether an event has a field holding the id the hold keys on: `superagent`, whichever thing declares the event. */
const carries = (event: Event, prefix: string | undefined) =>
  prefix !== undefined && Object.values(event.fields).some((f) => idPrefix(f) === prefix);

const where = (ctx: HoldContext, thing: string) => ctx.things[thing];
const placeOf = (t: ThingModel | undefined) => (t === undefined ? "?" : t.store ? `store ${t.store}` : t.lives === "actor" ? "the actor store" : "the default store");

export const holdsModel = (ctx: HoldContext) => {
  const out: Record<string, unknown> = {};
  const declaredIn = new Map<string, string>();
  const deliveries = deliveriesOf(ctx.layout);
  const eventOwner = new Map<Event, string>(
    [...ctx.layout.things].flatMap(([n, t]) => [...t.events.values()].map((e) => [e, n] as const)),
  );
  for (const [thingName, t] of ctx.layout.things) {
    for (const [name, { declaration: hold }] of t.holds) {
      const prefix = idPrefix(hold.key);
      const lists = ctx.layout.holdLists.filter((l) => l.declaration.hold === hold);
      const file = lists[0]?.file ?? `${t.base}/holds.ts`;
      const named = (event: Event, to: unknown) => ({ event: ctx.eventNames.get(event) ?? "?", to: ctx.opName(to) ?? "?" });
      const held = lists.flatMap((l) => l.declaration.held.map((d) => named(d.event, d.to)));
      const unheld = lists.flatMap((l) => l.declaration.unheld.map((d) => ({ ...named(d.event, d.to), reason: d.reason })));
      const ownMoves = new Set(Object.values(t.machine?.moves ?? {}).map((m) => m.emits));
      const row = (r: { event: string; to: string }) => `${r.event} to ${r.to}`;
      const listed = (r: { event: string; to: string }, rows: ReadonlyArray<{ event: string; to: string }>) => rows.some((x) => x.event === r.event && x.to === r.to);
      for (const d of deliveries.filter((x) => carries(x.event, prefix))) {
        const r = named(d.event, d.to);
        if (!listed(r, held) && !listed(r, unheld)) ctx.problems.push(`${file}: ${row(r)} is in neither the held nor the unheld list of ${name}: say whether the switch holds it, so new work cannot slip past a pause`);
      }
      const both = new Set(held.map((r) => r.event).filter((e) => unheld.some((u) => u.event === e)));
      for (const e of both) ctx.problems.push(`${file}: ${e} has deliveries on both the held and the unheld list of ${name}: the unheld work needs an event of its own`);
      for (const l of lists) for (const d of l.declaration.held) if (ownMoves.has(d.event)) {
        ctx.problems.push(`${l.file}: ${ctx.eventNames.get(d.event) ?? "?"} is held by ${name}, and it is the ${thingName}'s own move: holding it would deadlock the resume`);
      }
      for (const l of lists) for (const d of [...l.declaration.held, ...l.declaration.unheld]) {
        const owner = eventOwner.get(d.event);
        if (owner !== undefined && carries(d.event, prefix) && placeOf(where(ctx, owner)) !== placeOf(where(ctx, thingName))) {
          ctx.problems.push(`${l.file}: the hold ${name} is on ${thingName}, which lives in ${placeOf(where(ctx, thingName))}, and ${ctx.eventNames.get(d.event) ?? "?"} is made in ${owner}, in ${placeOf(where(ctx, owner))}: a hold and the events it holds are in one store`);
          break;
        }
      }
      // A hold is named by its export, for the whole project: two things may not export one name.
      const first = declaredIn.get(name);
      if (first !== undefined) { ctx.problems.push(`${t.holds.get(name)!.file}: the hold ${name} is already declared in ${first}: a hold is named for the whole project, so give one another name`); continue; }
      declaredIn.set(name, t.holds.get(name)!.file);
      out[name] = {
        thing: thingName, key: hold.key.key, while: hold.while.map((s) => s.key),
        held: held.sort((a, b) => row(a).localeCompare(row(b))), unheld: unheld.sort((a, b) => row(a).localeCompare(row(b))),
      };
    }
  }
  return out;
};
