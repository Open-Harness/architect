// The rows of one entry: one per hop its event fans out to, selected from the journal row the batch has just written (M5-reach-out Q1.1).
// The row's event id is the journal's own `seq` under the store's prefix, so it is made in the same statement as the row it names: nothing to mint, and
// a request key that commits once makes the rows once. A parked row (a test's `outbox.hold`, read from `_outbox_rules`) is written held.
import type { SqlClient } from "effect/sql";
import type { Entry } from "@orthograph/language-effect";
import type { HopTable } from "../types.ts";

export const fanout = (sql: SqlClient.SqlClient, entry: Entry, hops: HopTable | undefined, prefix: string, due: number) =>
  (hops?.get(entry.event) ?? []).map((hop) => {
    const held = hop.hold === undefined ? undefined : entry.fields[hop.hold.field];
    const by = held === undefined || held === null ? null : hop.hold!.by;
    const subject = held === undefined || held === null ? null : String(held);
    // The journal row this batch wrote last is the entry's: a D1 batch is one transaction, and nothing else writes inside it.
    return sql`INSERT INTO "_outbox" ("event", "to", "seq", "name", "subject", "trace", "state", "attempts", "due", "hold", "hold_by")
      SELECT ${prefix} || j."seq", ${hop.to}, j."seq", j."event", j."subject", j."trace", 'pending', 0, ${due},
        coalesce((SELECT r."hold" FROM "_outbox_rules" r WHERE r."name" = j."event" AND r."to" = ${hop.to} LIMIT 1), ${subject}),
        CASE WHEN EXISTS (SELECT 1 FROM "_outbox_rules" r WHERE r."name" = j."event" AND r."to" = ${hop.to}) THEN 'test' ELSE ${by} END
      FROM "_journal" j WHERE j."seq" = (SELECT max("seq") FROM "_journal")`;
  });
