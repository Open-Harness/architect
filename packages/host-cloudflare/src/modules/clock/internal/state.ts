// The instant a world keeps: one row in the world's own SQLite storage. Stepped time stands still until it is moved;
// scaled time flows at its speed from the real instant the row was last written; real time is the wall clock and has no row.
import { DateTime, Option } from "effect";
import { Spans } from "orthograph/server";
import type { ClockDeclaration, ClockState, Moved } from "../types.ts";
import { wall } from "./date.ts";

const UNIT_MS = { second: 1_000, minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 } as const;

const refused = (status: 400 | 409, _tag: "ClockNotMovable" | "BadMove", message: string): Moved => ({ ok: false, status, body: { _tag, message } });

/** `from` plus a span in words: seconds to weeks are fixed lengths; months and years go by the calendar, in UTC. */
export const plus = (from: number, span: string): number | undefined => {
  const read = Spans.read(span);
  if (read === undefined) return undefined;
  if (read.unit === "month" || read.unit === "year") {
    return DateTime.toEpochMillis(DateTime.add(DateTime.makeUnsafe(from), read.unit === "month" ? { months: read.count } : { years: read.count }));
  }
  return from + read.count * UNIT_MS[read.unit];
};

interface Row {
  readonly instant: number;
  readonly speed: number;
  readonly anchor: number;
}

const SCHEMA = "CREATE TABLE IF NOT EXISTS clock (one INTEGER PRIMARY KEY CHECK (one = 1), instant INTEGER NOT NULL, speed REAL NOT NULL, anchor INTEGER NOT NULL)";

/** A world's clock over its storage. A real clock keeps nothing and refuses every move. */
export const stateOf = (sql: SqlStorage, declaration: ClockDeclaration): ClockState => {
  if (declaration.kind === "real") {
    const no = () => refused(409, "ClockNotMovable", "this world runs on the real clock, which nothing can move");
    return { kind: "real", now: wall, advance: no, moveTo: no };
  }
  sql.exec(SCHEMA);
  const speed = declaration.kind === "scaled" ? declaration.speed : 0;
  const starts = Option.getOrElse(Option.map(DateTime.make(declaration.starts), DateTime.toEpochMillis), () => wall());
  sql.exec("INSERT OR IGNORE INTO clock (one, instant, speed, anchor) VALUES (1, ?, ?, ?)", starts, speed, wall());
  const row = (): Row => sql.exec<Row & Record<string, SqlStorageValue>>("SELECT instant, speed, anchor FROM clock WHERE one = 1").one();
  const now = (): number => {
    const r = row();
    return r.speed === 0 ? r.instant : Math.floor(r.instant + (wall() - r.anchor) * r.speed);
  };
  const set = (to: number): Moved => {
    sql.exec("UPDATE clock SET instant = ?, anchor = ? WHERE one = 1", to, wall());
    return { ok: true, now: to };
  };
  return {
    kind: declaration.kind,
    now,
    advance: (span) => {
      const target = plus(now(), span);
      return target === undefined ? refused(400, "BadMove", `"${span}" isn't a span: a whole number of seconds, minutes, hours, days, weeks, months or years, like "1 month"`) : set(target);
    },
    moveTo: (to) => {
      const at = DateTime.make(to);
      if (Option.isNone(at)) return refused(400, "BadMove", `"${to}" isn't an instant (ISO 8601, like 2027-01-10T09:00:00Z)`);
      const target = DateTime.toEpochMillis(at.value);
      return target < now() ? refused(400, "BadMove", `the world's clock never goes back: it is at ${new Date(now()).toISOString()}`) : set(target);
    },
  };
};
