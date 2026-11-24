// The drain (M5-reach-out Q1.3, Q5): one pass takes every row that is due now, in journal order, claims it, delivers it and records the outcome only where
// its claim is still its own. A delivery that dies is retried with backoff (1 s, doubling, never more than an hour, 15 attempts), then the row is `failed`,
// kept and shown. A refusal is an answer and ends the row. Held rows are not taken at all. The pass is counted work, and when it is over it says when
// something is due again, so the caller's timer (a durable timer on the world's clock) wakes it then: no wall clock, no `setTimeout`.
import { Clock, Effect } from "effect";
import { Busy } from "@orthograph/language-effect";
import { claim, holdsIn, next, settle, soonest, type Taken } from "./claim.ts";
import { deliver } from "./deliver.ts";
import { POLICY, type DrainOptions, type Hop, type OutboxDb, type Policy } from "../types.ts";

/** A pass that never ends (a delivery that makes work for itself without end) stops here, and the next wake takes up what is left. */
const PASS_LIMIT = 5_000;

const delay = (policy: Policy, attempts: number) => Math.min(policy.backoff * 2 ** attempts, policy.max);

/** The event's fields as the journal kept them, in wire form. */
const fieldsOf = (db: D1Database, seq: number) =>
  Effect.promise(() => db.prepare(`SELECT "fields" FROM "_journal" WHERE "seq" = ?`).bind(seq).first<{ fields: string }>()).pipe(
    Effect.map((r) => (r === null ? undefined : (JSON.parse(r.fields) as unknown))),
  );

const one = <R>(o: DrainOptions<R>, policy: Policy, { db, prefix }: OutboxDb, holds: ReadonlyArray<string>, row: Taken, token: string, now: number) =>
  Effect.gen(function* () {
    void prefix;
    const hop = o.hops.find((h: Hop) => h.name === row.name && h.to === row.to.replace(/^op:/, ""));
    const fields = yield* fieldsOf(db, row.seq);
    const outcome = hop === undefined || fields === undefined
      ? { kind: "defect" as const, outcome: hop === undefined ? `no hop declares ${row.name} to ${row.to}` : `the journal has no row ${row.seq}` }
      : yield* deliver(hop, o.served, row.event, fields);
    // An interrupt (a reset, the world's bound) records nothing: the claim's lease ends, and the row is taken again.
    if (outcome === undefined) return;
    const end = yield* Clock.currentTimeMillis;
    if (outcome.kind === "delivered") yield* settle(db, row, token, { state: "delivered", attempts: row.attempts, due: end, outcome: outcome.outcome });
    else if (outcome.kind === "refused") yield* settle(db, row, token, { state: "refused", attempts: row.attempts, due: end, outcome: outcome.outcome });
    else {
      const made = row.attempts + 1;
      yield* settle(db, row, token, made >= policy.attempts
        ? { state: "failed", attempts: made, due: end, outcome: outcome.outcome }
        : { state: "pending", attempts: made, due: end + delay(policy, row.attempts), outcome: outcome.outcome });
    }
    void now;
  });

/** The row the next take is, from whichever database has one: each database's rows are in its own order, and one thing is in one database. */
const pass = <R>(o: DrainOptions<R>) =>
  Effect.gen(function* () {
    const policy = o.policy ?? POLICY;
    const holds = yield* Effect.forEach(o.dbs, (d) => holdsIn(d.db, o.holds));
    for (let taken = 0; taken < PASS_LIMIT; taken++) {
      let progressed = false;
      for (const [i, d] of o.dbs.entries()) {
        const now = yield* Clock.currentTimeMillis;
        const row = yield* next(d.db, holds[i]!, now);
        if (row === undefined) continue;
        const token = crypto.randomUUID();
        if (!(yield* claim(d.db, holds[i]!, row, token, now, policy.lease))) { progressed = true; continue; }
        yield* one(o, policy, d, holds[i]!, row, token, now);
        progressed = true;
      }
      if (!progressed) break;
    }
    const now = yield* Clock.currentTimeMillis;
    const wake = yield* Effect.forEach(o.dbs, (d, i) => soonest(d.db, holds[i]!, now));
    const at = wake.filter((t): t is number => t !== undefined);
    yield* o.next(at.length === 0 ? undefined : Math.min(...at));
  });

export const drain = <R>(o: DrainOptions<R>): Effect.Effect<void, never, R | Busy> =>
  Effect.flatMap(Effect.service(Busy), (busy) => busy.as("outbox/drain").counted(pass(o)));
