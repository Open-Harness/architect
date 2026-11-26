// More shapes (CX-from-doctype), from the hostile pass: Infusion, a one-word name starting with a vowel whose code
// Invitation already holds (IN, so INF); Data with Phone and URL options (text, not email); a default on a field that
// isn't reqd (required, not in the payload); a reqd field that is read only (kept, not in the payload); two tables,
// one not reqd, each in the payload and the writes, in order; a line linking to a record type not scaffolded; and a
// right no role holds ("to no role").
import { afterAll, describe, expect, it } from "vitest";
import { type FieldJson, accepts, blanksOf, checked, cleanup, doctype, fill, generated, headed, model, once, operationOf, project, scaffolds, snapshot, thingOf, whoMayAct, written } from "./support.ts";

afterAll(cleanup);

const blank = once(() => {
  const root = project();
  const before = snapshot(root);
  scaffolds(root, doctype("infusion"));
  return { root, wrote: written(before, root) };
});
const filled = once(() => {
  const root = project();
  scaffolds(root, doctype("infusion"));
  const count = fill(root, ["infusion"]);
  generated(root);
  return { root, count, m: model(root) };
});

const infusionId = { value: { type: "id", prefix: "inf" }, ref: "infusion.id" };
const infusion = {
  id: { value: { type: "id", prefix: "inf" } },
  infusionName: { value: { type: "text", max: 140 }, description: "Infusion Name" },
  phone: { value: { type: "text", max: 140 }, optional: true, description: "Phone" },
  website: { value: { type: "text", max: 140 }, optional: true, description: "Website" },
  brewCount: { value: { type: "decimal", places: 0 }, description: "Brew Count (ERPNext's default: 3)" },
  batchCode: { value: { type: "text", max: 140 }, description: "Batch Code" },
  kettle: { value: { type: "text", max: 140 }, optional: true, description: "Kettle (a Tea Kettle's name)" },
} as const;
const step = {
  id: { value: { type: "id", prefix: "ist" } },
  parent: { ...infusionId, description: "The Infusion this row belongs to." },
  idx: { value: { type: "uint", bits: 32 }, description: "Its place in the table, from 1." },
  kettle: { value: { type: "text", max: 140 }, named: "TeaKettleLink", description: "Kettle (a Tea Kettle's name)" },
  minutes: { value: { type: "decimal", places: 0 }, description: "Minutes" },
  temperature: { value: { type: "decimal", places: 1 }, optional: true, description: "Temperature" },
} as const;
const tag = {
  id: { value: { type: "id", prefix: "ita" } },
  parent: { ...infusionId, description: "The Infusion this row belongs to." },
  idx: { value: { type: "uint", bits: 32 }, description: "Its place in the table, from 1." },
  tag: { value: { type: "text", max: 140 }, description: "Tag" },
} as const;

/** Fields compared whole and in order; an optional link may or may not keep its value's name. */
const sameFields = (fields: Readonly<Record<string, FieldJson>>, expected: Readonly<Record<string, FieldJson>>) => {
  expect(Object.keys(fields)).toEqual(Object.keys(expected));
  for (const [key, field] of Object.entries(expected)) {
    const { named, ...rest } = fields[key] ?? ({} as FieldJson);
    expect(field.optional === true && field.named === undefined && named === "TeaKettleLink" ? rest : fields[key], key).toEqual(field);
  }
};

describe("CX-from-doctype 08: more shapes", () => {
  it("writes the doctype's files, both lines and one link value shared by the doctype and a line, each opening with its scaffold line", () => {
    const { root, wrote } = blank();
    const own = ["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/get.ts"].map((f) => `blueprint/things/infusion/${f}`);
    expect(wrote).toEqual([...own, "blueprint/things/infusion-step/thing.ts", "blueprint/things/infusion-tag/thing.ts", "blueprint/values/tea-kettle-link.ts"].sort());
    headed(root, [...own, "blueprint/values/tea-kettle-link.ts"], "infusion.json", "Infusion");
    headed(root, ["blueprint/things/infusion-step/thing.ts"], "infusion_step.json", "Infusion Step");
    headed(root, ["blueprint/things/infusion-tag/thing.ts"], "infusion_tag.json", "Infusion Tag");
  });

  it("maps Data with other options to text, keeps a default's field required and a read-only reqd field, and names a link's target", () => {
    const t = thingOf(model(blank().root), "infusion");
    sameFields(t.fields, infusion);
    expect([t.code, t.description]).toEqual(["INF", "Infusion, as ERPNext keeps it."]);
  });

  it("makes both tables lines, each with its own prefix and code, the step's link the shared value", () => {
    const m = model(blank().root);
    const s = thingOf(m, "infusion-step");
    sameFields(s.fields, step);
    expect([s.code, s.description, s.machine]).toEqual(["IS", "One row of an Infusion's Steps.", null]);
    const g = thingOf(m, "infusion-tag");
    sameFields(g.fields, tag);
    expect([g.code, g.description, g.machine]).toEqual(["IT", "One row of an Infusion's Tags.", null]);
  });

  it("says an, and says no role holds a right none is given", () => {
    const blanks = blanksOf(model(blank().root), ["infusion", "infusion-step", "infusion-tag"]);
    expect(Object.keys(blanks)).toEqual(["infusion.create", "infusion.get", "infusion.save"]);
    whoMayAct(blanks["infusion.create"], "create", "an infusion", "create", ["Tea Master"]);
    whoMayAct(blanks["infusion.save"], "save", "an infusion", "write", []);
    whoMayAct(blanks["infusion.get"], "get", "an infusion", "read", ["Tea Master"]);
  });

  it("once filled, create and save take the reqd fields that aren't read only and both tables, and write the infusion and both lines in order", () => {
    const { root, count, m } = filled();
    expect(count).toBe(3);
    const steps = { value: { type: "schema", format: "list", fields: ["kettle", "minutes"] }, description: "Steps" };
    const tags = { value: { type: "schema", format: "list", fields: ["tag"] }, description: "Tags" };
    const name = { ...infusion.infusionName, ref: "infusion.infusionName" };
    const create = operationOf(m, "infusion.create");
    const save = operationOf(m, "infusion.save");
    expect(create.payload).toEqual({ infusionName: name, steps, tags });
    expect(save.payload).toEqual({ infusion: infusionId, infusionName: name, steps, tags });
    for (const op of [create, save]) expect(op.steps).toEqual({ record: expect.objectContaining({ type: "database", writes: ["infusion", "infusion-step", "infusion-tag"] }) });
    expect(accepts(root, "blueprint/things/infusion/verbs/create.ts", "default.payload.steps", [
      [{ kettle: "Kettle One", minutes: "3" }],
      [{ kettle: "Kettle One", minutes: "three" }],
      [{ minutes: "3" }],
    ])).toEqual([true, false, false]);
    expect(Object.keys(operationOf(m, "infusion.get").answer)).toEqual(["state", ...Object.keys(infusion).filter((k) => k !== "id")]);
    const said = checked(root);
    expect(said.lines, said.out).toContain("check ✔");
    expect(said.status, said.out).toBe(0);
  });
});
