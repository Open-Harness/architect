// S-19 / HAN-18 (G5 section 6, ST1.11), the D1 store's half: D1 checks a unique index statement by statement and has no deferred check, so a commit that takes a
// key an earlier row still holds is a `conflict` whatever its final values would be, and the same commit with the freeing row first lands. These are the same cases,
// with the same answers, as the memory store's in `packages/language-effect/src/modules/records/write-order.test.ts`: the two stores must agree on every call.
// Real workerd, real D1, the table of test/migrations/0007_moveables.sql. Written by the checks author; the builder never edits this file.
//
// The D1 cases pin what D1 does, so they pass now (the memory store must match them). The one case that goes through the unit and the store together fails until the
// unit orders its writes. Respelled at ST1.20 onto G5's rule, as the memory half is (see its header): `handle.oneHolderPerName`, handed to the store and the unit.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Store, Unit, type Write } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "./service.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) },
});
const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
const rules = [{ name: "handle.oneHolderPerName", rule: (Blueprint as any).invariant.unique(Handle.fields.name, { while: [machine.states.claimed] }) }];
const store = StoreD1.layer({ tables: [[Handle, "moveable"]], rules }).pipe(Layer.provide(Database.d1(env.DB)));
const run = <A,>(program: Effect.Effect<A, never, Store>) => Effect.runPromise(program.pipe(Effect.provide(store)));

const insert = (id: string, name: string, owner: string, state = "claimed"): Write => ({ kind: "insert", thing: Handle, fields: { id, name, owner }, state });
const rename = (id: string, version: number, changes: Record<string, string>): Write => ({ kind: "update", thing: Handle, id, version, changes, state: undefined }) as any;
const move = (id: string, version: number, state: string): Write => ({ kind: "update", thing: Handle, id, version, changes: {}, state });
const commit = (...writes: ReadonlyArray<Write>) => Effect.flatMap(Store, (s) => s.commit({ writes, entries: [] }));
const namesOf = (...ids: ReadonlyArray<string>) => Promise.all(ids.map((id) => env.DB.prepare(`SELECT "name" FROM "moveable" WHERE "id" = ?`).bind(id).first<{ name: string }>().then((r) => r?.name)));

describe("S-19 on D1: write by write, the index decides", () => {
  it("A takes `y` while B still holds it: a conflict, and neither row changes", async () => {
    await run(commit(insert("hdl_o1", "x", "p1"), insert("hdl_o2", "y", "p2")));
    expect(await run(commit(rename("hdl_o1", 0, { name: "y" }), rename("hdl_o2", 0, { name: "z" })))).toBe("conflict");
    expect(await namesOf("hdl_o1", "hdl_o2")).toEqual(["x", "y"]);
  });

  it("the same two writes with B first (B frees `y`, A takes it): committed", async () => {
    await run(commit(insert("hdl_q1", "x2", "q1"), insert("hdl_q2", "y2", "q2")));
    expect(await run(commit(rename("hdl_q2", 0, { name: "z2" }), rename("hdl_q1", 0, { name: "y2" })))).toBe("committed");
    expect(await namesOf("hdl_q1", "hdl_q2")).toEqual(["y2", "z2"]);
  });

  it("a straight swap is a conflict in either order, though its final values are distinct", async () => {
    await run(commit(insert("hdl_s1", "xs", "s1"), insert("hdl_s2", "ys", "s2")));
    expect(await run(commit(rename("hdl_s1", 0, { name: "ys" }), rename("hdl_s2", 0, { name: "xs" })))).toBe("conflict");
    expect(await run(commit(rename("hdl_s2", 0, { name: "xs" }), rename("hdl_s1", 0, { name: "ys" })))).toBe("conflict");
    expect(await namesOf("hdl_s1", "hdl_s2")).toEqual(["xs", "ys"]);
  });

  it("a row that leaves the scope frees its key for the next write, and an insert that comes first is refused", async () => {
    await run(commit(insert("hdl_f1", "xf", "f1")));
    expect(await run(commit(insert("hdl_f2", "xf", "f2"), move("hdl_f1", 0, "released")))).toBe("conflict");
    expect(await run(commit(move("hdl_f1", 0, "released"), insert("hdl_f2", "xf", "f2")))).toBe("committed");
  });
});

describe("S-19 through the unit and D1 together", () => {
  it("A `x` to `y` then B `y` to `z`, as a handler writes them: the unit orders them and the call commits", async () => {
    await run(commit(insert("hdl_u1", "xu", "u1"), insert("hdl_u2", "yu", "u2")));
    const outcome = await run(Effect.gen(function* () {
      const s = yield* Store;
      const unit = yield* Unit.make(s, rules);
      yield* unit.records.update(Handle, "hdl_u1", { name: "yu" });
      yield* unit.records.update(Handle, "hdl_u2", { name: "zu" });
      return yield* s.commit({ writes: yield* unit.writes, entries: [] });
    }));
    expect(outcome).toBe("committed");
    expect(await namesOf("hdl_u1", "hdl_u2")).toEqual(["yu", "zu"]);
  });
});
