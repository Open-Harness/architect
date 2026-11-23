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

/** `accepted` when this id was new, `seen` when the inbox already had it: the unique id decides, in the database, so five deliveries at once are one. */
export const accept = (db: D1Database, d: Delivery): Effect.Effect<"accepted" | "seen"> =>
  Effect.promise(() =>
    db.prepare(`INSERT INTO "_journal" ("id", "trace", "operation", "move", "subject", "event", "fields", "actor") VALUES (?, ?, ?, '', ?, ?, ?, ?) ON CONFLICT ("id") DO NOTHING`)
      .bind(d.id, d.trace, `in:${d.mount}`, d.id, d.event, JSON.stringify(d.fields), d.actor === undefined ? null : JSON.stringify(d.actor))
      .run()
      .then((result) => (result.meta.changes > 0 ? ("accepted" as const) : ("seen" as const))),
  );
