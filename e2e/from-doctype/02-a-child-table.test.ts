// A record type with a child table (CX-from-doctype): Tea Menu and its Tea Menu Entry, read from ERPNext's own layout
// (each doctype in a folder of its name). The table becomes a line with `parent` and `idx`, no machine and no
// operation; the menu's create and save take its rows and write both. Tea Blend is scaffolded first, so the entry's
// link to it is an edge.
import { afterAll, describe, expect, it } from "vitest";
import { accepts, blanksOf, checked, cleanup, doctype, fill, generated, headed, model, nested, once, operationOf, project, scaffolds, snapshot, thingOf, whoMayAct, written } from "./support.ts";

afterAll(cleanup);

const withBlend = (root: string) => scaffolds(root, doctype("tea_blend"), "--asset", "usdc");
const blank = once(() => {
  const root = project();
  withBlend(root);
  const before = snapshot(root);
  scaffolds(root, nested("tea_menu"), "--asset", "usdc");
  return { root, wrote: written(before, root) };
});
const filled = once(() => {
  const root = project();
  withBlend(root);
  scaffolds(root, nested("tea_menu"), "--asset", "usdc");
  const count = fill(root, ["tea-blend", "tea-menu", "tea-menu-entry"]);
  generated(root);
  return { root, count, m: model(root) };
});

const usdc = { token: "usdc" };
const menuId = { value: { type: "id", prefix: "tme" }, ref: "tea-menu.id" };
const menu = {
  id: { value: { type: "id", prefix: "tme" } },
  title: { value: { type: "text", max: 140 }, description: "Title" },
  season: { value: { type: "schema", format: "choice", options: ["Spring", "Summer", "Autumn", "Winter"] }, optional: true, description: "Season" },
  printed: { value: { type: "schema", format: "bool" }, description: "Printed" },
} as const;
// The line's id takes `tme` plus an x: Tea Menu, written first, holds `tme`.
const entry = {
  id: { value: { type: "id", prefix: "tmex" } },
  parent: { ...menuId, description: "The Tea Menu this row belongs to." },
  idx: { value: { type: "uint", bits: 32 }, description: "Its place in the table, from 1." },
  blend: { value: { type: "id", prefix: "tbl" }, ref: "tea-blend.id", description: "Blend" },
  cupPrice: { value: { type: "money", bits: 128, signed: true, asset: usdc }, description: "Cup Price" },
  potPrice: { value: { type: "money", bits: 128, signed: true, asset: usdc }, description: "Pot Price" },
  note: { value: { type: "text", max: 65535 }, optional: true, description: "Note" },
} as const;

describe("CX-from-doctype 02: a record type with a child table", () => {
  it("finds the table in ERPNext's layout and writes the menu's files and the line's thing.ts, and nothing else", () => {
    const { root, wrote } = blank();
    const files = [
      ...["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/get.ts"].map((f) => `blueprint/things/tea-menu/${f}`),
      "blueprint/things/tea-menu-entry/thing.ts",
    ].sort();
    expect(wrote).toEqual(files);
    headed(root, wrote.filter((p) => p.includes("/tea-menu/")), "tea_menu.json", "Tea Menu");
    headed(root, ["blueprint/things/tea-menu-entry/thing.ts"], "tea_menu_entry.json", "Tea Menu Entry");
  });

  it("keeps the menu's own fields and not the table, which is no field", () => {
    const t = thingOf(model(blank().root), "tea-menu");
    expect(Object.keys(t.fields)).toEqual(Object.keys(menu));
    for (const [key, field] of Object.entries(menu)) expect(t.fields[key], key).toEqual(field);
  });

  it("makes the table a line: parent and idx first, then its own fields, an edge to the blend scaffolded before it, layout dropped", () => {
    const t = thingOf(model(blank().root), "tea-menu-entry");
    expect(Object.keys(t.fields)).toEqual(Object.keys(entry));
    for (const [key, field] of Object.entries(entry)) expect(t.fields[key], key).toEqual(field);
    expect([t.identifier, t.code, t.description, t.lives]).toEqual(["TeaMenuEntry", "TME", "One row of a Tea Menu's Entries.", "database"]);
    expect(thingOf(model(blank().root), "tea-menu").code).toBe("TM");
  });

  it("gives the line no machine, no events, no operation, no read and no blank: it is written with its parent", () => {
    const m = model(blank().root);
    const t = thingOf(m, "tea-menu-entry");
    expect([t.machine, t.events]).toEqual([null, {}]);
    expect(Object.keys(m.operations).filter((k) => k.startsWith("tea-menu-entry."))).toEqual([]);
    expect(Object.keys(m.blankOperations ?? {}).filter((k) => k.startsWith("tea-menu-entry."))).toEqual([]);
    expect(blanksOf(m, ["tea-menu-entry"])).toEqual({});
  });

  it("leaves the menu's who may act blank, and nothing else", () => {
    const blanks = blanksOf(model(blank().root), ["tea-menu"]);
    expect(Object.keys(blanks)).toEqual(["tea-menu.create", "tea-menu.get", "tea-menu.save"]);
    whoMayAct(blanks["tea-menu.create"], "create", "a tea menu", "create", ["Tea Master"]);
    whoMayAct(blanks["tea-menu.save"], "save", "a tea menu", "write", ["Tea Master"]);
    whoMayAct(blanks["tea-menu.get"], "get", "a tea menu", "read", ["Tea Master"]);
  });

  it("once filled, create and save take the rows as a list of the line's reqd fields that aren't read only, and write the menu and its lines", () => {
    const { root, count, m } = filled();
    expect(count, "tea blend's three blanks and tea menu's three").toBe(6);
    const rows = { value: { type: "schema", format: "list", fields: ["blend", "cupPrice"] }, description: "Entries" };
    const create = operationOf(m, "tea-menu.create");
    expect([create.payload, create.answer]).toEqual([{ title: { ...menu.title, ref: "tea-menu.title" }, entries: rows }, { teaMenu: menuId }]);
    const save = operationOf(m, "tea-menu.save");
    expect(save.payload).toEqual({ teaMenu: menuId, title: { ...menu.title, ref: "tea-menu.title" }, entries: rows });
    for (const op of [create, save]) {
      expect(Object.keys(op.steps)).toEqual(["record"]);
      expect([op.steps["record"]?.type, op.steps["record"]?.writes]).toEqual(["database", ["tea-menu", "tea-menu-entry"]]);
    }
    // Each row is the line's own fields: a blend's id and an amount, never text in their place.
    const rowsOf = (at: string) => accepts(root, at, "default.payload.entries", [
      [{ blend: "tbl_x", cupPrice: "1500000" }],
      [],
      [{ blend: "tbl_x", cupPrice: "lots" }],
      [{ blend: 7, cupPrice: "1500000" }],
      [{ blend: "tbl_x" }],
      { blend: "tbl_x", cupPrice: "1500000" },
    ]);
    for (const at of ["blueprint/things/tea-menu/verbs/create.ts", "blueprint/things/tea-menu/verbs/save.ts"]) expect(rowsOf(at), at).toEqual([true, true, false, false, false, false]);
    expect(Object.keys(operationOf(m, "tea-menu.get").answer)).toEqual(["state", "title", "season", "printed"]);
    const said = checked(root);
    expect(said.lines, said.out).toContain("check ✔");
    expect(said.status, said.out).toBe(0);
  });
});
