// #764, the handler's half of a list: `Records.list(query)` runs `Store.list`'s query (`where`, `state`, `order`, `limit`, `after`) and answers a `Listed`
// page, overlaid with this call's own writes the way `find` is. Written by the checks author for Goal 16 (slice 8b's leave needs it); the builder never
// edits this file or `list-race.test.ts`, and only removes lines from `expected-failing/`.
//
// SURFACE PINNED HERE (asked of the author if a builder needs it changed): `records.list({ thing, where, state, order, limit, after })`, every field
// given as `ListQuery` has it, answering `{ items, next }` as `Store.list` does. Rows are in the order they were made: a stored row this call moved into
// the list keeps its place (so the store must be able to say where a row it didn't list sits; D1 has its `rowid`), and a row this call made comes after
// every stored row, in the order made, as rows made later would. `list` is reached through a cast so this file compiles before it exists.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store, type Listed } from "./types.ts";

const Day = Blueprint.value(Blueprint.uint(32));
const Leave = Blueprint.thing({
  description: "Days off someone asked for.",
  fields: { id: Blueprint.id("lap"), employee: Blueprint.id("emp"), from: Day, to: Day },
});
const row = (id: string, employee: string, from: number, to: number, state: string) => [Leave, { id, employee, from: BigInt(from), to: BigInt(to), state }] as const;
// In the order they were made: ada has three open applications, one cancelled and one approved; bob has one.
const stocked = () => storeMemory([
  row("lap_1", "emp_ada", 1, 3, "open"),
  row("lap_2", "emp_bob", 1, 3, "open"),
  row("lap_3", "emp_ada", 5, 6, "cancelled"),
  row("lap_4", "emp_ada", 10, 12, "open"),
  row("lap_5", "emp_ada", 14, 15, "approved"),
  row("lap_6", "emp_ada", 20, 22, "open"),
]);

type Query = { where: Record<string, unknown>; state?: string; order?: "newest" | "oldest"; limit?: number; after?: string | undefined };
const listOf = (records: any, q: Query): Effect.Effect<Listed> =>
  typeof records.list === "function"
    ? records.list({ thing: Leave, where: q.where, state: q.state, order: q.order ?? "oldest", limit: q.limit ?? 50, after: q.after })
    : Effect.die(new Error("Records.list is not built (#764)"));
const ids = (l: Listed) => l.items.map((i) => i["id"]);
const inUnit = <A,>(f: (unit: any, store: Store["Service"]) => Effect.Effect<A, any, any>) => {
  const memory = stocked();
  return Effect.runPromise(Effect.flatMap(Store, (store) => Effect.flatMap(Unit.make(store), (unit) => f(unit, store))).pipe(Effect.provide(memory.layer)) as Effect.Effect<A>)
    .then((a) => ({ a, memory }));
};

describe("Records.list: the store's rows (#764)", () => {
  it("lists by where and state, oldest or newest, a page at a time, with each row's fields and state", async () => {
    const { a } = await inUnit((unit) => Effect.gen(function* () {
      const r = unit.records;
      const first = yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 2 });
      const second = yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 2, after: first.next ?? undefined });
      const newestFirst = yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", order: "newest", limit: 2 });
      return {
        first, second,
        newestSecond: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", order: "newest", limit: 2, after: newestFirst.next ?? undefined }),
        newest: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", order: "newest", limit: 2 }),
        full: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 3 }),
        bobFull: yield* listOf(r, { where: { employee: "emp_bob" }, limit: 1 }),
        anyState: yield* listOf(r, { where: { employee: "emp_ada" } }),
        bob: yield* listOf(r, { where: { employee: "emp_bob" } }),
        approved: yield* listOf(r, { where: { employee: "emp_ada" }, state: "approved" }),
        nobody: yield* listOf(r, { where: { employee: "emp_cy" } }),
        writes: yield* unit.writes,
      };
    }));
    expect(ids(a.first)).toEqual(["lap_1", "lap_4"]);
    expect(a.first.items[1]).toEqual({ id: "lap_4", employee: "emp_ada", from: 10n, to: 12n, state: "open" });
    expect(a.first.next).not.toBeNull();
    expect(ids(a.second)).toEqual(["lap_6"]);
    expect(a.second.next).toBeNull();
    expect(ids(a.newest)).toEqual(["lap_6", "lap_4"]);
    // Newest pages go on toward older rows.
    expect(a.newestSecond).toEqual({ items: [{ id: "lap_1", employee: "emp_ada", from: 1n, to: 3n, state: "open" }], next: null });
    // A page that holds exactly the rest has no next.
    expect(ids(a.full)).toEqual(["lap_1", "lap_4", "lap_6"]);
    expect(a.full.next).toBeNull();
    expect(a.bobFull).toEqual({ items: [{ id: "lap_2", employee: "emp_bob", from: 1n, to: 3n, state: "open" }], next: null });
    expect(ids(a.anyState)).toEqual(["lap_1", "lap_3", "lap_4", "lap_5", "lap_6"]);
    expect(a.anyState.next).toBeNull();
    expect(ids(a.bob)).toEqual(["lap_2"]);
    expect(a.approved.items).toEqual([{ id: "lap_5", employee: "emp_ada", from: 14n, to: 15n, state: "approved" }]);
    expect(a.nobody).toEqual({ items: [], next: null });
    expect(a.writes).toEqual([]); // a list reads; it writes nothing
  });

  it("lists every matching row however many the store holds, and pages through them", async () => {
    const many = Array.from({ length: 240 }, (_, n) => row(`lap_m${String(n).padStart(3, "0")}`, n % 2 === 0 ? "emp_cy" : "emp_dee", n, n, "open"));
    const memory = storeMemory(many);
    const a = await Effect.runPromise(Effect.flatMap(Store, (store) => Effect.flatMap(Unit.make(store), (unit: any) => Effect.gen(function* () {
      const all = yield* listOf(unit.records, { where: { employee: "emp_cy" }, limit: 500 });
      const walked: Array<unknown> = [];
      let after: string | undefined;
      for (let n = 0; n < 10; n++) {
        const page = yield* listOf(unit.records, { where: { employee: "emp_cy" }, limit: 50, ...(after === undefined ? {} : { after }) });
        walked.push(...ids(page));
        if (page.next === null) break;
        after = page.next;
      }
      return { all, walked };
    }))).pipe(Effect.provide(memory.layer)) as Effect.Effect<any>);
    const cy = many.filter(([, i]) => i.employee === "emp_cy").map(([, i]) => i.id);
    expect(cy).toHaveLength(120);
    expect(ids(a.all)).toEqual(cy);
    expect(a.all.next).toBeNull();
    expect(a.walked).toEqual(cy);
  });
});

describe("Records.list: this call's own writes (#764)", () => {
  // Before the list, the call moves rows in and out of "ada's open applications" and makes one: lap_1 goes to bob (out of the where), lap_2 comes to ada
  // (into it), lap_3 reopens (into the state), lap_4's days change, lap_6 is cancelled (out of the state), and lap_7 and lap_9 (ada's, in that order)
  // and lap_8 (bob's) are new.
  const moved = (unit: any) => Effect.gen(function* () {
    const r = unit.records;
    yield* r.update(Leave, "lap_1", { employee: "emp_bob" });
    yield* r.update(Leave, "lap_2", { employee: "emp_ada" });
    yield* unit.setState(Leave, "lap_3", "open");
    yield* r.update(Leave, "lap_4", { from: 11n, to: 13n });
    yield* unit.setState(Leave, "lap_6", "cancelled");
    yield* r.insert(Leave, { id: "lap_7" as never, employee: "emp_ada" as never, from: 30n, to: 31n }, "open");
    yield* r.insert(Leave, { id: "lap_8" as never, employee: "emp_bob" as never, from: 30n, to: 31n }, "open");
    yield* r.insert(Leave, { id: "lap_9" as never, employee: "emp_ada" as never, from: 40n, to: 41n }, "open");
  });

  it("includes the rows it made and moved in, as it left them, drops those it moved out, and orders its own after the store's", async () => {
    const { a } = await inUnit((unit, store) => Effect.gen(function* () {
      yield* moved(unit);
      const r = unit.records;
      const page = yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 2 });
      const page2 = yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 2, after: page.next ?? undefined });
      return {
        page, page2,
        page3: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", limit: 2, after: page2.next ?? undefined }),
        oldest: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open" }),
        newest: yield* listOf(r, { where: { employee: "emp_ada" }, state: "open", order: "newest" }),
        bob: yield* listOf(r, { where: { employee: "emp_bob" }, state: "open" }),
        cancelled: yield* listOf(r, { where: { employee: "emp_ada" }, state: "cancelled" }),
        stored: (yield* store.find(Leave, "lap_1"))?.instance,
      };
    }));
    expect(ids(a.oldest)).toEqual(["lap_2", "lap_3", "lap_4", "lap_7", "lap_9"]);
    expect(a.oldest.items[2]).toEqual({ id: "lap_4", employee: "emp_ada", from: 11n, to: 13n, state: "open" });
    expect(a.oldest.items[1]).toEqual({ id: "lap_3", employee: "emp_ada", from: 5n, to: 6n, state: "open" });
    expect(a.oldest.items[3]).toEqual({ id: "lap_7", employee: "emp_ada", from: 30n, to: 31n, state: "open" });
    expect(a.oldest.next).toBeNull();
    expect(ids(a.newest)).toEqual(["lap_9", "lap_7", "lap_4", "lap_3", "lap_2"]);
    // The page is cut after the overlay: the store's first two (lap_1, lap_4) are not the call's first two.
    expect(ids(a.page)).toEqual(["lap_2", "lap_3"]);
    expect(a.page.next).not.toBeNull();
    // The call's own rows page with the rest: each comes once, and a page can end on one.
    expect(ids(a.page2)).toEqual(["lap_4", "lap_7"]);
    expect(a.page2.next).not.toBeNull();
    expect(a.page3).toEqual({ items: [{ id: "lap_9", employee: "emp_ada", from: 40n, to: 41n, state: "open" }], next: null });
    expect(ids(a.bob)).toEqual(["lap_1", "lap_8"]);
    expect(ids(a.cancelled)).toEqual(["lap_6"]);
    expect(a.stored).toMatchObject({ employee: "emp_ada", state: "open" }); // nothing was committed, only seen
  });
});
