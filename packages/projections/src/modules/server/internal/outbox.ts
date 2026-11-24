// The event outbox in the generated Worker (M5-reach-out Q1, Q3, GOAL17-outbox): each event's hops (the commit writes a row per hop), the drain that calls
// each hop's operation as the system, its wake on the world's timers, and the world's door on the rows. Nothing when the model declares no hop.
import type { Model } from "@orthograph/compiler";
import { opVar, toRoot } from "#modules/names/service.js";
import { hopsOf } from "./worker-config.ts";

const quoted = (s: string) => JSON.stringify(s);

export const outboxOf = (model: Model, mountVar: (mount: string) => string, imported: ReadonlyArray<string>, db: string, stores: ReadonlyArray<{ readonly binding: string }>) => {
  const table = hopsOf(model);
  const on = table.size > 0;
  const holds = Object.keys(model.holds ?? {});
  const ops = Object.values(model.operations);
  const mounts = Object.keys(model.mounts ?? {}).sort();
  const dbs = [`{ db: ${db}, prefix: "evt_" }`, ...stores.map((s, i) => `{ db: env.${s.binding}, prefix: "evt_${i + 1}_" }`)].join(", ");
  return {
    on,
    /** The mounts whose `on` verbs are hops: each imported once, with the mounts the server imports already. */
    imports: !on ? [] : mounts.filter((m) => !imported.includes(m)).map((m) => `import ${mountVar(m)} from "${toRoot("generated/server/main.ts")}${model.mounts![m]!.file}";`),
    /** Each event's hops by its name, for the commit; and the hops, with their maps, for the drain. */
    table: !on ? [] : [
      "/** Each event's hops, by the event's name: the commit writes one outbox row per hop, with the event (M5-reach-out Q1). */",
      "const hopTable = new Map<string, ReadonlyArray<HopRow>>([",
      ...[...table].sort(([a], [b]) => a.localeCompare(b)).map(([event, rows]) => `  [${quoted(event)}, [${rows.map((r) => `{ to: ${quoted(r.to)}${r.hold === undefined ? "" : `, hold: { by: ${quoted(r.hold.by)}, field: ${quoted(r.hold.field)} }`} }`).join(", ")}]],`),
      "]);",
      "",
      "/** The hops the blueprint declares, read from the declarations this Worker serves and from each mount's `on` verbs. */",
      `const outboxHops = Outbox.hopsOf([${ops.filter((o) => o.kind === "operation").map((o) => `[${quoted(o.name)}, ${opVar(o)}.declaration]`).join(", ")}], [${mounts.map(mountVar).join(", ")}]);`,
      "/** Each operation the drain may call, by name. */",
      `const outboxServed = { ${ops.filter((o) => o.kind === "operation").map((o) => `${quoted(o.name)}: ${opVar(o)}Served`).join(", ")} } as unknown as Readonly<Record<string, OutboxServed<Services>>>;`,
      "",
      "/**",
      " * One pass of the drain: every row due now, in order, called as the system. The next wake is a durable timer on the world's clock (so a stepped world's",
      " * move fires it, and a real world's alarm does); a pass that ends with nothing due leaves none.",
      " */",
      "const drainOutbox = (env: Env) =>",
      "  Outbox.drain<Services>({",
      `    dbs: [${dbs}], hops: outboxHops, served: outboxServed, holds: ${JSON.stringify(holds)},`,
      "    next: (at) => Effect.gen(function* () {",
      "      const timers = yield* DurableTimers;",
      "      yield* timers.clear(\"outbox\", \"wake\");",
      "      if (at !== undefined) yield* timers.set(at, \"outbox\", \"wake\", { kind: \"outbox\", payload: null });",
      "    }),",
      "  });",
      "",
      "/** A call that committed may have written rows: the drain is due now. A timer set once while one is pending, so a burst of calls is one wake. */",
      "const kickOutbox = Effect.gen(function* () {",
      "  const at = yield* Clock.currentTimeMillis;",
      "  yield* (yield* DurableTimers).set(at, \"outbox\", \"kick\", { kind: \"outbox\", payload: null });",
      "});",
      "",
    ],
    /** The world's door on the rows: only where the server hosts worlds, which `toWorld` is. */
    world: !on ? "" : `, outbox: [${dbs}]`,
    option: on ? ", outbox: hopTable" : "",
  };
};
