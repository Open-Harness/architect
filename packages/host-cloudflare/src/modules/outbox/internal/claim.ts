// What the drain asks of a database's `_outbox` (M5-reach-out Q1.3, GOAL17-pause): the next row that may be taken, and the claim, which is one statement.
// A row may be taken when it is due, no earlier row of its `(to, subject)` is still `pending` or `claimed`, and no hold parks it. A held row is simply
// not taken: it stays `pending`, keeps its place and has no attempt counted.
import { Effect } from "effect";

/** The hold views a database has (`_hold_<name>`): a hold's view is in the database of the thing it holds, which may be another store's. */
export const holdsIn = (db: D1Database, wanted: ReadonlyArray<string>): Effect.Effect<ReadonlyArray<string>> =>
  Effect.promise(() => db.prepare(`SELECT "name" FROM "sqlite_master" WHERE "type" = 'view' AND "name" LIKE '\\_hold\\_%' ESCAPE '\\'`).all<{ name: string }>()).pipe(
    Effect.map((r) => wanted.filter((h) => r.results.some((v) => v.name === `_hold_${h}`))),
  );

/** The row's `hold_by` names a hold that is on for the row's `hold`: the thing's view says so. A parked test row (`test`) is always on, until released. */
const parked = (holds: ReadonlyArray<string>) =>
  [`o."hold_by" = 'test'`, ...holds.map((h) => `(o."hold_by" = '${h}' AND EXISTS (SELECT 1 FROM "_hold_${h}" v WHERE v."key" = o."hold"))`)].join(" OR ");

const eligible = (holds: ReadonlyArray<string>) => `
  (o."state" = 'pending' OR o."state" = 'claimed')
  AND NOT (o."hold_by" IS NOT NULL AND (${parked(holds)}))
  AND NOT EXISTS (SELECT 1 FROM "_outbox" e WHERE e."to" = o."to" AND e."subject" = o."subject" AND e."seq" < o."seq" AND (e."state" = 'pending' OR e."state" = 'claimed'))`;

const takeable = (holds: ReadonlyArray<string>) => `${eligible(holds)} AND o."due" <= ?1`;

export interface Taken {
  readonly event: string;
  readonly to: string;
  readonly seq: number;
  readonly name: string;
  readonly attempts: number;
}

/** The next row that may be taken at `now`, in journal order, which is per `(to, subject)` order. */
export const next = (db: D1Database, holds: ReadonlyArray<string>, now: number): Effect.Effect<Taken | undefined> =>
  Effect.promise(() => db.prepare(`SELECT o."event", o."to", o."seq", o."name", o."attempts" FROM "_outbox" o WHERE ${takeable(holds)} ORDER BY o."seq" LIMIT 1`).bind(now).first<Taken>()).pipe(
    Effect.map((row) => row ?? undefined),
  );

/** Take it: the same conditions again, in the statement that claims, so nothing slips in between the look and the take. */
export const claim = (db: D1Database, holds: ReadonlyArray<string>, row: Taken, token: string, now: number, lease: number): Effect.Effect<boolean> =>
  Effect.promise(() =>
    db.prepare(`UPDATE "_outbox" AS o SET "state" = 'claimed', "claim" = ?2, "due" = ?1 + ?3 WHERE o."event" = ?4 AND o."to" = ?5 AND ${takeable(holds)}`)
      .bind(now, token, lease, row.event, row.to).run().then((r) => r.meta.changes > 0),
  );

/** Record an outcome only where the claim is still this token: a claimer whose lease ran out and was claimed again records nothing. */
export const settle = (db: D1Database, row: Taken, token: string, to: { readonly state: "delivered" | "refused" | "failed" | "pending"; readonly attempts: number; readonly due: number; readonly outcome: string | null }): Effect.Effect<boolean> =>
  Effect.promise(() =>
    db.prepare(`UPDATE "_outbox" SET "state" = ?1, "attempts" = ?2, "due" = ?3, "outcome" = ?4, "claim" = NULL WHERE "event" = ?5 AND "to" = ?6 AND "claim" = ?7`)
      .bind(to.state, to.attempts, to.due, to.outcome, row.event, row.to, token).run().then((r) => r.meta.changes > 0),
  );

/** The earliest instant after `now` a row that could be taken is due: what the drain's next wake is set for. A parked row is left out, or it would wake the drain forever. */
export const soonest = (db: D1Database, holds: ReadonlyArray<string>, now: number): Effect.Effect<number | undefined> =>
  Effect.promise(() =>
    db.prepare(`SELECT min(o."due") AS "at" FROM "_outbox" o WHERE ${eligible(holds)} AND o."due" > ?1`).bind(now).first<{ at: number | null }>(),
  ).pipe(Effect.map((r) => r?.at ?? undefined));
