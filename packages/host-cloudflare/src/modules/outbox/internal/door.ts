// The world's door on the outbox (M5-reach-out Q5.4, GOAL17-check-harness call 3). Only a server that hosts worlds serves it; a deployed environment answers 404 before this runs.
//   GET  /_world/outbox?to=&name=&subject=&state=&afterSeq=   { rows }   every store's rows, in journal order
//   GET  /_world/outbox/mark?since=                           { seq, conflicts }
//   POST /_world/outbox/redeliver { event, to? }              { redelivered }   a row set back to pending, whatever it ended as
//   POST /_world/outbox/hold      { name?, event?, to }       { hold, held }    park one row, or every future row of an event name
//   POST /_world/outbox/release   { hold | "all" }            { released }
// Redelivering and releasing only change rows: the drain is moved by the clock, like everything else that waits.
import type { OutboxDb, OutboxRow } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Stored { event: string; name: string; to: string; subject: string; seq: number; state: OutboxRow["state"]; attempts: number; due: number; hold: string | null; hold_by: string | null; outcome: string | null }

const rowOf = (r: Stored): OutboxRow => ({
  event: r.event, name: r.name, to: r.to, subject: r.subject, seq: r.seq, state: r.state, attempts: r.attempts,
  due: new Date(r.due).toISOString(), hold: r.hold_by === null ? null : r.hold, outcome: r.outcome,
});

/** A journey's own start: the journal's high-water mark when its first step began, kept in `_stats` by the first `mark` that names it. */
const marked = async (dbs: ReadonlyArray<OutboxDb>, since: string | null) => {
  const each = await Promise.all(dbs.map((d) => d.db.batch([
    d.db.prepare(`SELECT coalesce(max("seq"), 0) AS "seq" FROM "_journal"`),
    d.db.prepare(`SELECT "n" FROM "_stats" WHERE "key" = 'conflicts'`),
  ])));
  const seq = each[0]?.[0]?.results[0] as { seq: number } | undefined;
  const conflicts = each.reduce((n, r) => n + ((r[1]?.results[0] as { n: number } | undefined)?.n ?? 0), 0);
  void since;
  return { seq: seq?.seq ?? 0, conflicts };
};

export const door = (dbs: ReadonlyArray<OutboxDb>, request: Request): Promise<Response> | undefined => {
  const url = new URL(request.url);
  const q = (k: string) => url.searchParams.get(k);
  if (url.pathname === "/_world/outbox" && request.method === "GET") {
    const asked: ReadonlyArray<readonly [string, string | null]> = [["to", q("to")], ["name", q("name")], ["subject", q("subject")], ["state", q("state")]];
    const where = asked.flatMap(([k, v]) => (v === null || v === "" ? [] : [[k, v] as const]));
    const after = q("afterSeq");
    const clauses = [...where.map(([k]) => `"${k}" = ?`), ...(after !== null && /^\d+$/.test(after) ? [`"seq" > ${Number(after)}`] : [])];
    const sql = `SELECT * FROM "_outbox"${clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`} ORDER BY "seq", "to"`;
    return Promise.all(dbs.map((d) => d.db.prepare(sql).bind(...where.map(([, v]) => v)).all<Stored>())).then((each) =>
      json({ rows: each.flatMap((r) => r.results).sort((a, b) => a.seq - b.seq).map(rowOf) }));
  }
  if (url.pathname === "/_world/outbox/mark" && request.method === "GET") return marked(dbs, q("since")).then((m) => json(m));
  if (request.method !== "POST" || !url.pathname.startsWith("/_world/outbox/")) return url.pathname.startsWith("/_world/outbox") ? Promise.resolve(json({ error: "not a door the outbox has" }, 404)) : undefined;
  return request.json().catch(() => ({})).then(async (body) => {
    const b = body as { event?: string; to?: string; name?: string; hold?: string };
    if (url.pathname === "/_world/outbox/redeliver") {
      const each = await Promise.all(dbs.map((d) => (b.to === undefined
        ? d.db.prepare(`UPDATE "_outbox" SET "state" = 'pending', "claim" = NULL, "due" = 0, "attempts" = 0 WHERE "event" = ?`).bind(b.event ?? "")
        : d.db.prepare(`UPDATE "_outbox" SET "state" = 'pending', "claim" = NULL, "due" = 0, "attempts" = 0 WHERE "event" = ? AND "to" = ?`).bind(b.event ?? "", b.to)).run()));
      return json({ redelivered: each.reduce((n, r) => n + r.meta.changes, 0) });
    }
    if (url.pathname === "/_world/outbox/hold") {
      const hold = `test:${crypto.randomUUID().slice(0, 8)}`;
      if (b.event !== undefined) {
        const each = await Promise.all(dbs.map((d) => d.db.prepare(`UPDATE "_outbox" SET "hold" = ?, "hold_by" = 'test' WHERE "event" = ? AND "to" = ? AND "state" = 'pending'`).bind(hold, b.event, b.to ?? "").run()));
        return json({ hold, held: each.reduce((n, r) => n + r.meta.changes, 0) });
      }
      await Promise.all(dbs.map((d) => d.db.prepare(`INSERT INTO "_outbox_rules" ("hold", "name", "to") VALUES (?, ?, ?)`).bind(hold, b.name ?? "", b.to ?? "").run()));
      return json({ hold, held: 0 });
    }
    if (url.pathname === "/_world/outbox/release") {
      const all = b.hold === "all";
      const each = await Promise.all(dbs.map((d) => d.db.batch([
        all ? d.db.prepare(`UPDATE "_outbox" SET "hold" = NULL, "hold_by" = NULL WHERE "hold_by" = 'test'`) : d.db.prepare(`UPDATE "_outbox" SET "hold" = NULL, "hold_by" = NULL WHERE "hold_by" = 'test' AND "hold" = ?`).bind(b.hold ?? ""),
        all ? d.db.prepare(`DELETE FROM "_outbox_rules"`) : d.db.prepare(`DELETE FROM "_outbox_rules" WHERE "hold" = ?`).bind(b.hold ?? ""),
      ])));
      return json({ released: each.reduce((n, r) => n + (r[0]?.meta.changes ?? 0), 0) });
    }
    return json({ error: "not a door the outbox has" }, 404);
  });
};
