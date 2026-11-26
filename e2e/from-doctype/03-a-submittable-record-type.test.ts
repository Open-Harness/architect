// A submittable record type (CX-from-doctype): Tea Invoice gets ERPNext's docstatus, draft, submitted and cancelled,
// with create, save, submit and cancel; its derived `status` and `amended_from` are dropped. Who may act is blank per
// move, naming the roles holding that right: cancel is the manager's alone, and ERPNext's "All" may read.
import { afterAll, describe, expect, it } from "vitest";
import { blanksOf, checked, cleanup, doctype, fill, generated, headed, model, once, operationOf, project, scaffolds, snapshot, textAt, thingOf, whoMayAct, written } from "./support.ts";

afterAll(cleanup);

const file = doctype("tea_invoice");
const blank = once(() => {
  const root = project();
  const before = snapshot(root);
  scaffolds(root, file, "--asset", "usdc");
  return { root, wrote: written(before, root) };
});
const filled = once(() => {
  const root = project();
  scaffolds(root, file, "--asset", "usdc");
  const count = fill(root, ["tea-invoice"]);
  generated(root);
  return { root, count, m: model(root) };
});

const id = { value: { type: "id", prefix: "tin" }, ref: "tea-invoice.id" };
const fields = {
  id: { value: { type: "id", prefix: "tin" } },
  customerName: { value: { type: "text", max: 140 }, description: "Customer Name" },
  postingDate: { value: { type: "day" }, description: "Posting Date (ERPNext's default: Today)" },
  total: { value: { type: "money", bits: 128, signed: true, asset: { token: "usdc" } }, optional: true, description: "Total" },
  remarks: { value: { type: "text", max: 65535 }, optional: true, description: "Remarks" },
} as const;
const moves = {
  create: { from: [], to: ["draft"], emits: "TeaInvoiceCreated" },
  save: { from: ["draft"], to: ["draft"], emits: "TeaInvoiceSaved" },
  submit: { from: ["draft"], to: ["submitted"], emits: "TeaInvoiceSubmitted" },
  cancel: { from: ["submitted"], to: ["cancelled"], emits: "TeaInvoiceCancelled" },
} as const;

describe("CX-from-doctype 03: a submittable record type", () => {
  it("writes a verb per docstatus move and get, and nothing else", () => {
    const { root, wrote } = blank();
    const files = ["thing.ts", "machine.ts", "events.ts", "verbs/create.ts", "verbs/save.ts", "verbs/submit.ts", "verbs/cancel.ts", "verbs/get.ts"].map((f) => `blueprint/things/tea-invoice/${f}`).sort();
    expect(wrote).toEqual(files);
    headed(root, wrote, "tea_invoice.json", "Tea Invoice");
  });

  it("drops the derived status, amended_from and naming_series, and keeps a reqd field with a default required", () => {
    const t = thingOf(model(blank().root), "tea-invoice");
    expect(Object.keys(t.fields)).toEqual(Object.keys(fields));
    for (const [key, field] of Object.entries(fields)) expect(t.fields[key], key).toEqual(field);
    expect([t.code, t.description]).toEqual(["TI", "Tea Invoice, as ERPNext keeps it."]);
  });

  it("has ERPNext's docstatus machine: draft, submitted, cancelled, with create, save, submit and cancel and their events", () => {
    const t = thingOf(model(blank().root), "tea-invoice");
    expect(t.machine?.states).toEqual(["draft", "submitted", "cancelled"]);
    expect(t.machine?.moves).toEqual(moves);
    expect(t.events).toEqual(Object.fromEntries(Object.values(moves).map((m) => [m.emits, { teaInvoice: id }])));
  });

  it("writes the derived status's options beside the machine, as a comment, not as states", () => {
    const machine = textAt(blank().root, "blueprint/things/tea-invoice/machine.ts");
    const comments = machine.split("\n").filter((l) => l.trim().startsWith("//")).join("\n");
    for (const option of ["Draft", "Submitted", "Paid", "Cancelled"]) expect(comments, option).toContain(option);
  });

  it("leaves who may act blank per move: the rights of each ERPNext role at level 0, each named once, All among them, and cancel the manager's alone", () => {
    const blanks = blanksOf(model(blank().root), ["tea-invoice"]);
    expect(Object.keys(blanks)).toEqual(["tea-invoice.cancel", "tea-invoice.create", "tea-invoice.get", "tea-invoice.save", "tea-invoice.submit"]);
    whoMayAct(blanks["tea-invoice.create"], "create", "a tea invoice", "create", ["Tea Clerk", "Tea Manager"]);
    whoMayAct(blanks["tea-invoice.save"], "save", "a tea invoice", "write", ["Tea Clerk", "Tea Manager"]);
    whoMayAct(blanks["tea-invoice.submit"], "submit", "a tea invoice", "submit", ["Tea Clerk", "Tea Manager"]);
    whoMayAct(blanks["tea-invoice.cancel"], "cancel", "a tea invoice", "cancel", ["Tea Manager"]);
    whoMayAct(blanks["tea-invoice.get"], "get", "a tea invoice", "read", ["Tea Clerk", "Tea Manager", "All"]);
  });

  it("once filled, each operation makes its move, submit and cancel take the id alone and write the invoice, and ortho check passes", () => {
    const { root, count, m } = filled();
    expect(count).toBe(5);
    const create = operationOf(m, "tea-invoice.create");
    expect(create.payload).toEqual({ customerName: { ...fields.customerName, ref: "tea-invoice.customerName" }, postingDate: { ...fields.postingDate, ref: "tea-invoice.postingDate" } });
    expect(Object.keys(operationOf(m, "tea-invoice.save").payload)).toEqual(["teaInvoice", "customerName", "postingDate"]);
    for (const verb of ["submit", "cancel"] as const) expect(operationOf(m, `tea-invoice.${verb}`).payload, verb).toEqual({ teaInvoice: id });
    for (const verb of Object.keys(moves) as Array<keyof typeof moves>) {
      const op = operationOf(m, `tea-invoice.${verb}`);
      expect([op.kind, op.move, op.answer], verb).toEqual(["operation", { key: verb, ...moves[verb] }, { teaInvoice: id }]);
      expect(Object.keys(op.steps), verb).toEqual(["record"]);
      expect([op.steps["record"]?.type, op.steps["record"]?.writes ?? ["tea-invoice"]], verb).toEqual(["database", ["tea-invoice"]]);
    }
    expect(Object.keys(operationOf(m, "tea-invoice.get").answer)).toEqual(["state", "customerName", "postingDate", "total", "remarks"]);
    const said = checked(root);
    expect(said.lines, said.out).toContain("check ✔");
    expect(said.status, said.out).toBe(0);
  });
});
