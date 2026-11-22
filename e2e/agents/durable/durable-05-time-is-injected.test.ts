// 05 M4.04: nothing on this path reads ambient time (M4-agents call 4). The seam takes `Clock` and `Timers`; a run whose
// Clock is three days ahead stores that Clock's instants, fires its waits on it through Timers, and runs its turns and
// tools as counted work (`Busy`). The model stand-in's own message timestamps are a literal (child.ts), so the only
// instants the run can hold are the seam's. Turns green with slice 4 (M4.04, #377).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config, finish, killWhen, lines, once, runFile, scenario, start, type RunView, type Settled } from "./support.ts";

const RUN = "run-time";
const OFFSET = 3 * 86_400_000;
const HOUR = 3_600_000;

const cut = once(async () => {
  const where = scenario("time");
  const t0 = Date.now();
  const first = start(config(where, RUN, { hold: "model", offsetMs: OFFSET }));
  await killWhen(first, () => lines(where.out, "requests").length >= 1, "the model's first reply in flight");
  const second = await finish<{ settled: Settled; view: RunView }>(start(config(where, RUN, { process: "second", submit: false, offsetMs: OFFSET })));
  return { where, second, t0, t1: Date.now() };
});

/** Every number a run's SQLite file holds, in any column or inside any JSON text, that could be an epoch millisecond. */
const instants = (file: string): ReadonlyArray<number> => {
  const found: Array<number> = [];
  const walk = (value: unknown): void => {
    if (typeof value === "number" || typeof value === "bigint") { if (Number(value) > 1_500_000_000_000 && Number(value) < 3_000_000_000_000) found.push(Number(value)); return; }
    if (typeof value === "string") { if (/^[[{]/.test(value)) { try { walk(JSON.parse(value)); } catch { /* not JSON */ } } return; }
    if (value instanceof Uint8Array) { walk(Buffer.from(value).toString("utf8")); return; }
    if (value !== null && typeof value === "object") for (const inner of Object.values(value)) walk(inner);
  };
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>) {
      for (const row of db.prepare(`SELECT * FROM "${name}"`).all()) walk(row);
    }
  } finally { db.close(); }
  return found;
};

describe("05 M4.04: time is the world's", () => {
  it("the transcript's times, as the run's Clock stamped them, are three days ahead of the platform's", async () => {
    const { second, t0, t1 } = await cut();
    for (const entry of second.view.entries.filter((e) => e.kind !== "assistant")) {
      expect(entry.at, `${entry.kind} entry`).toBeGreaterThanOrEqual(t0 + OFFSET);
      expect(entry.at, `${entry.kind} entry`).toBeLessThanOrEqual(t1 + OFFSET);
    }
  });

  it("the run's file holds the Clock's instants, and not one of the platform's", async () => {
    const { where, t0, t1 } = await cut();
    const held = instants(runFile(where.root, RUN));
    const platform = held.filter((n) => n >= t0 - HOUR && n <= t1 + HOUR);
    const clock = held.filter((n) => n >= t0 + OFFSET - HOUR && n <= t1 + OFFSET + HOUR);
    expect(platform, "instants read from the platform clock").toEqual([]);
    expect(clock.length, "instants stored from the run's Clock").toBeGreaterThanOrEqual(3);
  });

  it("the retry after the cut waits through Timers, on the run's Clock", async () => {
    const { where, t0, t1 } = await cut();
    const timers = lines<{ kind: string; at?: number }>(where.out, "timers").filter((l) => l.process === "second");
    expect(timers.length, "Timers calls made after the restart").toBeGreaterThan(0);
    for (const timer of timers.filter((l) => l.kind === "at")) {
      expect(timer.at, "a timer is due on the Clock, not the platform's").toBeGreaterThanOrEqual(t0 + OFFSET);
      expect(timer.at).toBeLessThanOrEqual(t1 + OFFSET + HOUR);
    }
  });

  it("every model request and tool call runs as counted work", async () => {
    const { where } = await cut();
    const work = [...lines<{ busy: number }>(where.out, "requests"), ...lines<{ busy: number }>(where.out, "attempts")];
    expect(work.length).toBeGreaterThanOrEqual(3);
    for (const line of work) expect(line.busy, `${line.process} held no token while it worked`).toBeGreaterThanOrEqual(1);
  });

  it("the seam's source names no ambient clock or timer", () => {
    const source = join(import.meta.dirname, "../../../packages/agents/src");
    const files = (dir: string): ReadonlyArray<string> => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
    const own = files(source).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith("/main.ts"));
    expect(own.length, `no source under ${source}`).toBeGreaterThan(0);
    const ambient = /\b(Date\.now|new Date\(|setTimeout|setInterval|performance\.now|process\.hrtime)\b/;
    for (const file of own) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code, file).not.toMatch(ambient);
    }
  });
});
