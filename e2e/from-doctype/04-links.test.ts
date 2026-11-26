// Links (CX-from-doctype). Tea Order links to Tea Blend, scaffolded first (an edge, kept when optional), to Tea
// Supplier and Tea Shop, not scaffolded (ERPNext's form: the target's name, a shared `<Target>Link` value), to itself
// (its own id, no edge) and, through a Dynamic Link, to any record. Scaffolding Tea Supplier afterwards changes no
// file already written, shares the Tea Shop value, and makes its link back to Tea Order an edge.
import { afterAll, describe, expect, it } from "vitest";
import { checked, cleanup, doctype, generated, headed, model, once, project, scaffolds, snapshot, textAt, thingOf, written } from "./support.ts";

afterAll(cleanup);

const ordered = once(() => {
  const root = project();
  scaffolds(root, doctype("tea_blend"), "--asset", "usdc");
  const before = snapshot(root);
  scaffolds(root, doctype("tea_order"));
  return { root, wrote: written(before, root), after: snapshot(root) };
});
const supplied = once(() => {
  const { root, after } = ordered();
  scaffolds(root, doctype("tea_supplier"));
  return { root, wrote: written(after, root) };
});

const order = {
  id: { value: { type: "id", prefix: "tor" } },
  blend: { value: { type: "id", prefix: "tbl" }, ref: "tea-blend.id", description: "Blend" },
  secondBlend: { value: { type: "id", prefix: "tbl" }, ref: "tea-blend.id", optional: true, description: "Second Blend" },
  supplier: { value: { type: "text", max: 140 }, named: "TeaSupplierLink", description: "Supplier" },
  shop: { value: { type: "text", max: 140 }, named: "TeaShopLink", optional: true, description: "Shop" },
  returnAgainst: { value: { type: "id", prefix: "tor" }, optional: true, description: "Return Against" },
  party: { value: { type: "schema", format: "ref-any" }, description: "Party" },
} as const;
const supplier = {
  id: { value: { type: "id", prefix: "tsu" } },
  supplierName: { value: { type: "text", max: 140 }, description: "Supplier Name" },
  shop: { value: { type: "text", max: 140 }, named: "TeaShopLink", optional: true, description: "Shop" },
  lastOrder: { value: { type: "id", prefix: "tor" }, ref: "tea-order.id", optional: true, description: "Last Order" },
} as const;
const linkFiles = ["blueprint/values/tea-shop-link.ts", "blueprint/values/tea-supplier-link.ts"];

describe("CX-from-doctype 04: links", () => {
  it("writes a link value for each record type not scaffolded yet, beside the thing's files", () => {
    const { root, wrote } = ordered();
    const files = [...["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/get.ts"].map((f) => `blueprint/things/tea-order/${f}`), ...linkFiles].sort();
    expect(wrote).toEqual(files);
    headed(root, wrote, "tea_order.json", "Tea Order");
  });

  it("makes each kind of link its own field: an edge, an optional edge, a target's name, its own id, any record; the Dynamic Link's doctype field is dropped", () => {
    const t = thingOf(model(ordered().root), "tea-order");
    expect(Object.keys(t.fields)).toEqual(Object.keys(order));
    for (const [key, field] of Object.entries(order)) expect(t.fields[key], key).toEqual(field);
  });

  it("scaffolds the target later without touching what was written: the earlier link stays a name, and the shared link value is kept", () => {
    const { root, wrote } = supplied();
    const { after } = ordered();
    const files = ["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/get.ts"].map((f) => `blueprint/things/tea-supplier/${f}`).sort();
    expect(wrote, "only Tea Supplier's own files are new; tea-shop-link.ts is shared, not written again").toEqual(files);
    for (const path of Object.keys(after)) expect(snapshot(root)[path], path).toBe(after[path]);
    expect(textAt(root, "blueprint/values/tea-shop-link.ts").split("\n")[0]).toBe("// Scaffolded from tea_order.json, ERPNext's Tea Order. Yours from now on.");
  });

  it("gives the later record type the shared value and an edge back to the one already there", () => {
    const m = model(supplied().root);
    const t = thingOf(m, "tea-supplier");
    expect(Object.keys(t.fields)).toEqual(Object.keys(supplier));
    for (const [key, field] of Object.entries(supplier)) expect(t.fields[key], key).toEqual(field);
    expect(thingOf(m, "tea-order").fields["supplier"]).toEqual(order.supplier);
  });

  it("type-checks and passes the rules with the three record types and their link values", () => {
    const { root } = supplied();
    generated(root);
    const said = checked(root);
    for (const line of ["types ✔", "rules ✔"]) expect(said.lines, said.out).toContain(line);
  });
});
