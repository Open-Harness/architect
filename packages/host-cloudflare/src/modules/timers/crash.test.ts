// A firing is not lost when the world dies in the middle of it (M8-timers-shape: at least once): the row stays, marked firing, until
// its wake has returned, and building the table again puts it back to pending.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { DurableTimer } from "@orthograph/language-effect";
import { makeCount } from "./internal/count.ts";
import { makeTable } from "./internal/table.ts";

const AT = Date.parse("2027-02-10T09:00:00.000Z");
const wake = (payload: string) => ({ kind: "keeper", payload }) as const;

/** The world's storage, handed to `use` so a table can be built on it twice: the second build is the world after it came back. */
const storage = <A>(name: string, use: (sql: SqlStorage) => A | Promise<A>) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), (_instance, state) => use(state.storage.sql));

const build = (sql: SqlStorage, wakes: (timer: DurableTimer) => Effect.Effect<void>) => makeTable(sql, makeCount(), wakes, true);
const records = (sql: SqlStorage) => sql.exec<{ id: number; firing: number; wake: string }>("SELECT id, firing, wake FROM timers ORDER BY id").toArray();

describe("a firing the world died in the middle of", () => {
  it("survives the table being built again, and fires again", async () => {
    await storage("crash-survives", async (sql) => {
      const before = build(sql, () => Effect.never);
      before.set(AT, "keeper/membership.renew/mem_1", "due", wake("mem_1"));
      // The wake starts and never returns: the world dies here. Its row is out of the pending set but not gone.
      Effect.runFork(before.fire(AT, undefined));
      expect(before.durable()).toEqual([]);
      expect(records(sql)).toMatchObject([{ firing: 1 }]);

      const woke: Array<string> = [];
      const after = build(sql, (timer) => Effect.sync(() => void woke.push(String(timer.wake.payload))));
      // Pending again, due as it was.
      expect(after.durable()).toMatchObject([{ at: AT, owner: "keeper/membership.renew/mem_1", wake: wake("mem_1") }]);
      expect(after.earliest(AT)).toBe(AT);
      await Effect.runPromise(after.fire(AT, undefined));
      expect(woke).toEqual(["mem_1"]);
      expect(records(sql)).toEqual([]);
    });
  });

  it("is overtaken by a replacement the wake set before the world died: the replacement wins and there is one row", async () => {
    await storage("crash-replaced", async (sql) => {
      const before = build(sql, () => Effect.never);
      before.set(AT, "keeper/membership.renew/mem_1", "due", wake("old"));
      Effect.runFork(before.fire(AT, undefined));
      before.set(AT + 86_400_000, "keeper/membership.renew/mem_1", "due", wake("new"));

      const after = build(sql, () => Effect.void);
      expect(after.durable()).toMatchObject([{ at: AT + 86_400_000, wake: wake("new") }]);
      expect(records(sql)).toHaveLength(1);
    });
  });

  it("a wake that fails is pending again unless it was replaced, and a successful wake leaves no record", async () => {
    await storage("crash-record", async (sql) => {
      const fails = build(sql, () => Effect.die("down"));
      fails.set(AT, "a", "due", wake("a"));
      expect((await Effect.runPromise(Effect.result(fails.fire(AT, undefined))))._tag).toBe("Failure");
      expect(records(sql)).toMatchObject([{ firing: 0 }]);

      const works = build(sql, () => Effect.void);
      await Effect.runPromise(works.fire(AT, undefined));
      expect(records(sql)).toEqual([]);
    });
  });
});

describe("an instant the world cannot hold", () => {
  it("is refused on every way into the table, so the clock door and the walk keep working", async () => {
    await storage("crash-instants", (sql) => {
      const table = build(sql, () => Effect.void);
      for (const bad of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, 8.64e15 + 1]) {
        expect(() => table.add("probe.nap", "sleep", bad, "probe.nap")).toThrow(/finite instant/);
        expect(() => table.set(bad, "keeper/x", "due", wake("x"))).toThrow(/finite instant/);
      }
      expect(() => table.set(AT, "keeper/x", "due", { kind: "keeper", payload: 1n as never })).toThrow();
      expect(table.rows()).toEqual([]);
      table.set(8.64e15, "keeper/x", "due", wake("x"));
      expect(table.rows()).toHaveLength(1);
    });
  });
});
