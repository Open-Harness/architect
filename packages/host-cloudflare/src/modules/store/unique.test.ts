// G5 (ST1.13), the D1 store's half: a commit that breaks a rule's index is a `conflict`, never a defect, so the call runs again and its `findBy` sees
// the winner. It replaces G4's test. The tables are test/migrations/0005_handles.sql and 0006_user_handles.sql: what the host's DDL makes from the
// model's invariants, one partial unique index per rule, named `<table>_<rule>`, over the rule's key and scope. Real workerd, real D1.
// Written by the checks author; the builder never edits this file or those migrations.
//
// SURFACE PINNED HERE: the host is handed the rules the model carries, `StoreD1.layer({ tables, rules })`, as `{ name, rule }` entries, and the migration the
// DDL writes is the one in test/migrations (a builder whose DDL differs changes the DDL, or asks the author). The rules are built when a test asks, not when
// the file loads: before ST1.14 `Blueprint.invariant` does not exist, and the control must still run.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Store, type Write } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "./service.ts";

const B = Blueprint as any;
const layerWith = (options: { readonly tables: ReadonlyArray<readonly [any, string]>; readonly rules?: ReadonlyArray<any> }): Layer.Layer<Store> =>
  (StoreD1.layer as any)(options).pipe(Layer.provide(Database.d1(env.DB)));

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) },
});
const once = <A,>(make: () => A): (() => A) => { let made: A | undefined; return () => (made ??= make()); };
const rules = once(() => {
  const machine = Blueprint.machine(Handle, {
    states: ["claimed", "released"],
    moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
    notFrom: { exit: 60 },
  });
  return [
    { name: "handle.oneHolderPerName", rule: B.invariant.unique(Handle.fields.name, { while: [(machine as any).states.claimed] }) },
    { name: "handle.oneNamePerPerson", rule: B.invariant.unique(Handle.fields.owner, { while: [(machine as any).states.claimed] }) },
  ];
});
const plain = StoreD1.layer({ tables: [[Handle, "handle"]] }).pipe(Layer.provide(Database.d1(env.DB)));
const governed = once(() => layerWith({ tables: [[Handle, "handle"]], rules: rules() }));
const run = <A,>(program: Effect.Effect<A, never, Store>) => Effect.runPromise(program.pipe(Effect.provide(governed())));
const runPlain = <A,>(program: Effect.Effect<A, never, Store>) => Effect.runPromise(program.pipe(Effect.provide(plain)));

const insert = (id: string, name: string, state: string, owner = ""): Write => ({ kind: "insert", thing: Handle, fields: { id, name, owner }, state });
const move = (id: string, version: number, state: string): Write => ({ kind: "update", thing: Handle, id, version, changes: {}, state });
const commit = (...writes: ReadonlyArray<Write>) => Effect.flatMap(Store, (s) => s.commit({ writes, entries: [] }));
const rowsOf = () => env.DB.prepare(`SELECT "id" FROM "handle" ORDER BY "id"`).all<{ id: string }>().then((r) => r.results.map((x) => x.id));

describe("G5 control: the table and its indexes are there, and a plain insert commits", () => {
  it("has one partial unique index per rule, named for it, and commits a handle outside any clash", async () => {
    const indexes = await env.DB.prepare(`SELECT "name", "sql" FROM sqlite_master WHERE type = 'index' AND tbl_name = 'handle' AND name LIKE 'handle_%' ORDER BY name`).all<{ name: string; sql: string }>();
    expect(indexes.results.map((i) => i.name)).toEqual(["handle_oneHolderPerName", "handle_oneNamePerPerson"]);
    expect(indexes.results[0]?.sql).toMatch(/WHERE "state" IN \('claimed'\)/);
    expect(await runPlain(commit(insert("hdl_control", "control", "claimed", "c0")))).toBe("committed");
    expect(await runPlain(Effect.flatMap(Store, (s) => s.find(Handle, "hdl_control")))).toMatchObject({ instance: { name: "control", state: "claimed" } });
  });
});

describe("a rule in D1 (G5)", () => {
  it("refuses a second holder of a name as a conflict, and writes none of that commit", async () => {
    expect(await run(commit(insert("hdl_a1", "ada", "claimed", "oa1")))).toBe("committed");
    // The loser also inserts another name; the whole commit is refused, so that one is not stored either.
    const lost = await run(commit(insert("hdl_a2", "ada", "claimed", "oa2"), insert("hdl_b1", "bob", "claimed", "ob1")));
    expect(lost).toBe("conflict");
    expect((await rowsOf()).filter((id) => id.startsWith("hdl_a") || id.startsWith("hdl_b"))).toEqual(["hdl_a1"]);
  });

  it("refuses a second rule on its own key: one owner, two names, as a conflict", async () => {
    expect(await run(commit(insert("hdl_e1", "eve", "claimed", "oe")))).toBe("committed");
    expect(await run(commit(insert("hdl_e2", "eve2", "claimed", "oe")))).toBe("conflict");
    expect(await run(commit(insert("hdl_e3", "eve3", "released", "oe")))).toBe("committed"); // outside the scope
  });

  it("leaves the scope free: a released holder keeps its name, and the same name may be claimed again", async () => {
    expect(await run(commit(insert("hdl_c1", "cy", "claimed", "oc1")))).toBe("committed");
    expect(await run(commit(move("hdl_c1", 0, "released")))).toBe("committed");
    expect(await run(commit(insert("hdl_c2", "cy", "claimed", "oc2")))).toBe("committed"); // freed
    expect(await run(commit(insert("hdl_c3", "cy", "released", "oc3")))).toBe("committed"); // outside the scope: any number
  });

  it("refuses a move back into the scope while another holds the name, and lets it land once they let go", async () => {
    expect(await run(commit(insert("hdl_d1", "di", "claimed", "od1")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 0, "released")))).toBe("committed");
    expect(await run(commit(insert("hdl_d2", "di", "claimed", "od2")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 1, "claimed")))).toBe("conflict");
    const row = await env.DB.prepare(`SELECT "state", "version" FROM "handle" WHERE "id" = 'hdl_d1'`).first();
    expect(row).toEqual({ state: "released", version: 1 }); // untouched
    expect(await run(commit(move("hdl_d2", 0, "released")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 1, "claimed")))).toBe("committed");
  });

  it("is a conflict however many race: of ten concurrent first claims of one name, one commits and nine conflict, none dies", { timeout: 60_000 }, async () => {
    const outcomes = await Promise.all(Array.from({ length: 10 }, (_, i) => run(commit(insert(`hdl_r${i}`, "grace", "claimed", `or${i}`)))));
    expect(outcomes.filter((o) => o === "committed")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "conflict")).toHaveLength(9);
    expect((await rowsOf()).filter((id) => id.startsWith("hdl_r"))).toHaveLength(1);
  });

  it("is a conflict even when one commit breaks both rules at once", async () => {
    expect(await run(commit(insert("hdl_f1", "fay", "claimed", "of")))).toBe("committed");
    expect(await run(commit(insert("hdl_f2", "fay", "claimed", "of")))).toBe("conflict");
  });
});

// A multiword thing's table is hyphenated (projections server/internal/server.ts), and D1's message keeps the hyphen:
// `UNIQUE constraint failed: user-handle.name`. The refusal must still be a conflict, never a defect (Codex P2 on #118).
describe("a rule on a thing with a hyphenated table (G5)", () => {
  const UserHandle = Blueprint.thing({
    description: "A name someone holds, in a multiword thing.",
    code: "UH",
    fields: { id: Blueprint.id("uhd"), name: Blueprint.text({ max: 40 }) },
  });
  const hyphenated = once(() => {
    const userMachine = Blueprint.machine(UserHandle, {
      states: ["claimed", "released"],
      moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) } },
      notFrom: { exit: 60 },
    });
    const oneUserPerName = B.invariant.unique(UserHandle.fields.name, { while: [(userMachine as any).states.claimed] });
    return layerWith({ tables: [[UserHandle, "user-handle"]], rules: [{ name: "user-handle.oneUserPerName", rule: oneUserPerName }] });
  });
  const put = (id: string, name: string, state: string) => Effect.runPromise(
    Effect.flatMap(Store, (s) => s.commit({ writes: [{ kind: "insert", thing: UserHandle, fields: { id, name }, state }], entries: [] })).pipe(Effect.provide(hyphenated())));

  it("a first claim commits, and a name outside the scope commits again", async () => {
    expect(await put("uhd_k1", "kay", "claimed")).toBe("committed");
    expect(await put("uhd_k2", "kay", "released")).toBe("committed");
  });

  it("a duplicate claim is a conflict, not a defect, and concurrent ones leave one owner", { timeout: 60_000 }, async () => {
    expect(await put("uhd_a1", "ann", "claimed")).toBe("committed");
    expect(await put("uhd_a2", "ann", "claimed")).toBe("conflict");
    const raced = await Promise.all(Array.from({ length: 6 }, (_, i) => put(`uhd_r${i}`, "ray", "claimed")));
    expect(raced.filter((o) => o === "committed")).toHaveLength(1);
    expect(raced.filter((o) => o === "conflict")).toHaveLength(5);
  });
});
