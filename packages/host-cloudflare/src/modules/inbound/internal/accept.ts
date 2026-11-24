// The inbox is the journal (M5-reach-out Q2.3): one row per accepted delivery, its id `<mount>:<the event's identity>`, which is unique,
// so a delivery that comes twice, by any road, settles once. The row is in the request's trace.
import { Effect } from "effect";
import type { EventActor } from "orthograph";

export interface Delivery {
  readonly id: string;
  readonly trace: string;
  readonly mount: string;
  readonly event: string;
  readonly fields: unknown;
  readonly actor: EventActor | undefined;
}

/** The row the inbox kept for an id: the event's name and its payload as it first came. */
export interface Kept {
  readonly event: string;
  readonly fields: unknown;
}

/**
 * `accepted` when this id was new, `seen` with the kept row when the inbox already had it: the unique id decides, in the database, so five
 * deliveries at once are one. The kept row is only read, never changed.
 */
export type Settled = { readonly settled: "accepted" } | { readonly settled: "seen"; readonly kept: Kept | undefined };

export const accept = (db: D1Database, d: Delivery): Effect.Effect<Settled> =>
  Effect.promise(() =>
    db.prepare(`INSERT INTO "_journal" ("id", "trace", "operation", "move", "subject", "event", "fields", "actor") VALUES (?, ?, ?, '', ?, ?, ?, ?) ON CONFLICT ("id") DO NOTHING`)
      .bind(d.id, d.trace, `in:${d.mount}`, d.id, d.event, JSON.stringify(d.fields), d.actor === undefined ? null : JSON.stringify(d.actor))
      .run(),
  ).pipe(Effect.flatMap((result): Effect.Effect<Settled> =>
    result.meta.changes > 0
      ? Effect.succeed({ settled: "accepted" as const })
      : Effect.promise(() => db.prepare(`SELECT "event", "fields" FROM "_journal" WHERE "id" = ?`).bind(d.id).first<{ event: string; fields: string }>()).pipe(
          Effect.map((row) => ({ settled: "seen" as const, kept: row === null ? undefined : { event: row.event, fields: JSON.parse(row.fields) as unknown } })),
        )));
