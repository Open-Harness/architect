// The facts of a deployed environment, read from its D1 databases through Cloudflare's query API with the operator's own credential (D3 #127, "the cloud pass").
// The databases are the ones the run's prefix owns, found by name, never by a typed id. Neither the token nor the account id is printed: every message cut from an answer
// has both replaced first.
import { Effect, Option, Schema } from "effect";
import type { CallRecord, Facts } from "../types.ts";

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const API = "https://api.cloudflare.com/client/v4";
const PAGE = 100;
const PAGES_MAX = 50;

export interface D1Access {
  readonly token: string;
  readonly account: string;
  /** Whether a database's name belongs to the run: the staging plan's own test of its prefix. */
  readonly owns: (name: string) => boolean;
  /** The API's base address; a test stands a local server in for Cloudflare. */
  readonly api?: string;
}

export const d1Facts = ({ token, account, owns, api = API }: D1Access): Facts => {
  const redact = (text: string) => text.split(token).join("[token]").split(account).join("[account]").slice(0, 200);
  const call = (method: string, path: string, body?: object) =>
    Effect.promise(() =>
      fetch(`${api}/accounts/${account}${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
        .then((r) => r.text().then((t) => ({ status: r.status, text: t })), (e: unknown) => ({ status: 0, text: String(e) })),
    ).pipe(
      Effect.flatMap((r) => {
        const parsed = Option.getOrUndefined(parse(r.text)) as { success?: boolean; result?: unknown; errors?: ReadonlyArray<{ message?: string }> } | undefined;
        return parsed?.success === true
          ? Effect.succeed(parsed.result)
          : Effect.fail(redact(parsed?.errors?.map((e) => e.message ?? "").join("; ") || r.text || `no answer (${r.status})`));
      }),
    );
  const die = (what: string) => (why: string) => Effect.die(new Error(`reading ${what} from D1 failed: ${why}`));
  /** Every page of the account's databases: a shared account holds more than one page, and a database past the first must still be found. */
  const databases = Effect.gen(function* () {
    const owned: Array<string> = [];
    for (let page = 1; page <= PAGES_MAX; page += 1) {
      const r = yield* call("GET", `/d1/database?per_page=${PAGE}&page=${page}`);
      const listed = Array.isArray(r) ? (r as ReadonlyArray<{ uuid?: unknown; name?: unknown }>) : [];
      for (const d of listed) if (typeof d.uuid === "string" && typeof d.name === "string" && owns(d.name)) owned.push(d.uuid);
      if (listed.length < PAGE) return owned;
    }
    return yield* Effect.fail(`more than ${PAGE * PAGES_MAX} databases listed`);
  }).pipe(Effect.catch(die("the databases")));
  /** Every row `sql` returns in each of the run's databases; one without the table has none. */
  const rows = (sql: string, params: ReadonlyArray<string>) =>
    Effect.gen(function* () {
      const found: Array<Record<string, unknown>> = [];
      for (const id of yield* databases) {
        const result = yield* call("POST", `/d1/database/${id}/query`, { sql, params }).pipe(Effect.catch((why) => (/no such table/i.test(why) ? Effect.succeed([]) : die("a row")(why))));
        for (const part of Array.isArray(result) ? (result as ReadonlyArray<{ results?: ReadonlyArray<Record<string, unknown>> }>) : []) found.push(...(part.results ?? []));
      }
      return found;
    });
  return {
    record: (table, id) => (NAME.test(table) ? rows(`SELECT * FROM "${table}" WHERE "id" = ?`, [id]).pipe(Effect.map((r) => r[0] ?? null)) : Effect.succeed(null)),
    journal: (trace) =>
      rows(`SELECT * FROM "_journal" WHERE "trace" = ? ORDER BY "seq"`, [trace]).pipe(
        // One trace's rows can sit in several of the run's databases; together they keep the journal's own order.
        Effect.map((r) => [...r].sort((a, b) => Number(a["seq"]) - Number(b["seq"]))),
        Effect.flatMap((r) =>
          Effect.forEach(r, (row) =>
            Option.match(parse(String(row["fields"])), {
              onNone: () => die("a journal row")(`its fields are not JSON (seq ${String(row["seq"])})`),
              onSome: (fields) => Effect.succeed({ ...row, fields }),
            }),
          ),
        ),
        Effect.map((r) => r as unknown as CallRecord["journal"]),
      ),
  };
};
