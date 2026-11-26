// A plain record type (CX-from-doctype): Tea Blend, every field type the command knows, layout and dropped fields
// among them. The thing, its `active` machine, its create, save and get, each blank only for who may act, and once
// those are filled, a blueprint `ortho check` passes. Expected values are written here from the fixture and the
// decision, never read back from the output.
import { afterAll, describe, expect, it } from "vitest";
import { blanksOf, checked, cleanup, doctype, fill, generated, headed, model, once, operationOf, project, scaffolds, snapshot, thingOf, whoMayAct, written } from "./support.ts";

afterAll(cleanup);

const file = doctype("tea_blend");
const blank = once(() => {
  const root = project();
  const before = snapshot(root);
  scaffolds(root, file, "--asset", "usdc");
  return { root, wrote: written(before, root) };
});
const filled = once(() => {
  const root = project();
  scaffolds(root, file, "--asset", "usdc");
  const count = fill(root, ["tea-blend"]);
  generated(root);
  return { root, count, m: model(root) };
});

const usdc = { token: "usdc" };
// Every field Tea Blend keeps, in the JSON's order: naming_series, layout, the HTML, the button, the virtual field are gone.
const fields = {
  id: { value: { type: "id", prefix: "tbl" } },
  blendName: { value: { type: "text", max: 140 }, description: "Blend Name" },
  origin: { value: { type: "schema", format: "choice", options: ["India", "China", "Kenya"] }, description: "Origin" },
  caffeinated: { value: { type: "schema", format: "bool" }, description: "Caffeinated (ERPNext's default: 1)" },
  steepMinutes: { value: { type: "decimal", places: 0 }, optional: true, description: "Steep Minutes" },
  price: { value: { type: "money", bits: 128, signed: true, asset: usdc }, optional: true, description: "Price" },
  strength: { value: { type: "decimal", places: 2 }, optional: true, description: "Strength" },
  weight: { value: { type: "decimal", places: 9 }, optional: true, description: "Weight" },
  contactEmail: { value: { type: "text", max: 254 }, optional: true, description: "Contact Email" },
  harvestDate: { value: { type: "day" }, optional: true, description: "Harvest Date" },
  packedAt: { value: { type: "instant" }, optional: true, description: "Packed At" },
  steepTime: { value: { type: "schema" }, optional: true, description: "Steep Time" },
  tastingNotes: { value: { type: "text", max: 65535 }, optional: true, description: "Tasting Notes" },
  summary: { value: { type: "text", max: 65535 }, optional: true, description: "Summary" },
  recipe: { value: { type: "text", max: 65535 }, optional: true, description: "Recipe" },
  story: { value: { type: "text", max: 65535 }, optional: true, description: "Story" },
  fullText: { value: { type: "text", max: 65535 }, optional: true, description: "full_text" },
  labelImage: { value: { type: "text", max: 140 }, optional: true, description: "Label Image" },
  leaflet: { value: { type: "text", max: 140 }, optional: true, description: "Leaflet" },
  originNote: { value: { type: "text", max: 140 }, optional: true, description: "Origin Note" },
  grade: { value: { type: "schema", format: "choice", options: ["A", "B", "C"] }, description: "Grade (ERPNext's default: B)" },
} as const;
const id = { value: { type: "id", prefix: "tbl" }, ref: "tea-blend.id" };
const asPayload = (key: keyof typeof fields) => ({ ...fields[key], ref: `tea-blend.${key}` });

describe("CX-from-doctype 01: a plain record type", () => {
  it("writes the thing, its machine and events, create, save and get, and nothing else, each opening with the scaffold line", () => {
    const { root, wrote } = blank();
    const files = ["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/get.ts"].map((f) => `blueprint/things/tea-blend/${f}`).sort();
    expect(wrote).toEqual(files);
    headed(root, wrote, "tea_blend.json", "Tea Blend");
  });

  it("maps every field type to its value, in the JSON's order, required only with reqd, a default or a Check, and drops layout, virtual and naming_series", () => {
    const t = thingOf(model(blank().root), "tea-blend");
    expect(Object.keys(t.fields)).toEqual(Object.keys(fields));
    for (const [key, field] of Object.entries(fields)) expect(t.fields[key], key).toEqual(field);
  });

  it("names the thing from the doctype, takes its description, keeps it in the database, and writes no role", () => {
    const t = thingOf(model(blank().root), "tea-blend");
    expect([t.identifier, t.description, t.lives, t.roles]).toEqual(["TeaBlend", "A blend of teas, as the shop sells it.", "database", []]);
  });

  it("gives a record that isn't submittable one state, `active`, made by create and kept by save, each emitting its event of the id", () => {
    const t = thingOf(model(blank().root), "tea-blend");
    expect(t.machine?.states).toEqual(["active"]);
    expect(t.machine?.moves).toEqual({
      create: { from: [], to: ["active"], emits: "TeaBlendCreated" },
      save: { from: ["active"], to: ["active"], emits: "TeaBlendSaved" },
    });
    expect(t.machine?.notFrom.exit).toBe(40);
    expect(t.events).toEqual({ TeaBlendCreated: { teaBlend: id }, TeaBlendSaved: { teaBlend: id } });
  });

  it("leaves who may act blank, and nothing else: one blank per operation and read, naming the ERPNext roles holding that right", () => {
    const m = model(blank().root);
    const blanks = blanksOf(m, ["tea-blend"]);
    expect(Object.keys(blanks)).toEqual(["tea-blend.create", "tea-blend.get", "tea-blend.save"]);
    whoMayAct(blanks["tea-blend.create"], "create", "a tea blend", "create", ["Tea Master"]);
    whoMayAct(blanks["tea-blend.save"], "save", "a tea blend", "write", ["Tea Master"]);
    whoMayAct(blanks["tea-blend.get"], "get", "a tea blend", "read", ["Tea Master", "Tea Taster"]);
  });

  it("type-checks and passes the rules as scaffolded, with only those blanks left", () => {
    const { root } = blank();
    generated(root);
    const said = checked(root);
    for (const line of ["types ✔", "rules ✔"]) expect(said.lines, said.out).toContain(line);
    expect(said.lines.filter((l) => /^\S+ has \d+ blanks?$/.test(l)), said.out).toEqual(["tea-blend has 3 blanks"]);
  });

  it("once who may act is filled, create takes the reqd fields, save the id and the same, get answers every field, and ortho check passes", () => {
    const { root, count, m } = filled();
    expect(count, "three who-may-act blanks, each written as allowed: Blueprint.todo<never>(\"…\")").toBe(3);
    const create = operationOf(m, "tea-blend.create");
    expect([create.kind, create.payload, create.answer, create.move]).toEqual([
      "operation",
      { blendName: asPayload("blendName"), origin: asPayload("origin") },
      { teaBlend: id },
      { key: "create", from: [], to: ["active"], emits: "TeaBlendCreated" },
    ]);
    const save = operationOf(m, "tea-blend.save");
    expect([save.payload, save.answer, save.move]).toEqual([
      { teaBlend: id, blendName: asPayload("blendName"), origin: asPayload("origin") },
      { teaBlend: id },
      { key: "save", from: ["active"], to: ["active"], emits: "TeaBlendSaved" },
    ]);
    for (const op of [create, save]) {
      expect(Object.keys(op.steps)).toEqual(["record"]);
      expect([op.steps["record"]?.type, op.steps["record"]?.writes ?? ["tea-blend"]]).toEqual(["database", ["tea-blend"]]);
    }
    const get = operationOf(m, "tea-blend.get");
    expect([get.kind, Object.keys(get.payload), Object.keys(get.answer)]).toEqual(["read", ["id"], ["state", ...Object.keys(fields).filter((k) => k !== "id")]]);
    const said = checked(root);
    expect(said.lines, said.out).toContain("check ✔");
    expect(said.status, said.out).toBe(0);
  });
});
