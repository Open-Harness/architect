// #1132 (CX-open-sets): what the compiler refuses about open sets, each naming the file that declared it. Only a feature that depends on the
// set's owner (directly or through another feature it needs), or the app, adds to a set; only an open set takes members; a member is a name,
// and is in a set once. An installed feature that isn't mounted is never read, so what it would add can't be refused either. What the model
// holds is open-sets.test.ts; the scratch books are ./testing.ts. Written by the checks author for Goal 16; the builder never edits this file
// and only removes lines from `expected-failing/open-sets-refused.txt`.
import { describe, expect, it } from "vitest";
import { MOUNTED, books, modelExit, modelOf, optionsOf, problemsOf } from "./testing.ts";

/** The one problem naming `where`: a refusal must name the file that made it. */
const refusedAt = async (exit: ReturnType<typeof modelExit>, where: string) => {
  const problems = problemsOf(await exit);
  expect(problems.length, "the blueprint is refused").toBeGreaterThan(0);
  const named = problems.filter((p) => p.includes(where));
  expect(named, `a problem names ${where}; the problems were:\n${problems.join("\n")}`).toHaveLength(1);
  return named[0]!;
};

describe("#1132: what the compiler refuses about open sets", () => {
  it("refuses a feature adding to a value that isn't open, naming the adder's file, the value and how to open it", async () => {
    const b = books({ payments: (s, l) => ({ paymentEntry: s.add(l.VoucherType, ["Payment Entry"]), wrong: s.add(l.AccountType, ["Card"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED }), "@fixture/payments/blueprint/values/vouchers.js");
    expect(said).toContain("AccountType");
    expect(said).toContain("Blueprint.oneOf.open");
  });

  it("refuses the app adding to a value that isn't open, naming the app's file", async () => {
    const b = books();
    const wrong = { path: "values/accounts.ts", exports: { card: b.s.add(b.ledger.AccountType, ["Card"]) } };
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, files: [wrong] }), "blueprint/values/accounts.ts");
    expect(said).toContain("AccountType");
  });

  it("refuses a feature that doesn't depend on the set's owner adding to it, naming the adder, the owner and the member", async () => {
    const said = await refusedAt(modelExit(books(), { mounts: { ...MOUNTED, rogue: "rogue" } }), "@fixture/rogue/blueprint/values/rogue.js");
    expect(said).toContain("@fixture/ledger");
    expect(said).toContain("Rogue Entry");
  });

  it("refuses two features adding one member, naming both files and the member", async () => {
    const b = books({ expenses: (s, l) => ({ expenseClaim: s.add(l.VoucherType, ["Expense Claim", "Payment Entry"]) }) });
    const problems = problemsOf(await modelExit(b, { mounts: MOUNTED }));
    const said = problems.filter((p) => p.includes("Payment Entry"));
    expect(said, problems.join("\n")).toHaveLength(1);
    expect(said[0]).toContain("@fixture/payments/blueprint/values/vouchers.js");
    expect(said[0]).toContain("@fixture/expenses/blueprint/values/vouchers.js");
  });

  it("refuses a feature adding a member the owner already has, naming the adder, the owner's file and the member", async () => {
    const b = books({ payments: (s, l) => ({ paymentEntry: s.add(l.VoucherType, ["Payment Entry", "Journal Entry"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED }), "@fixture/payments/blueprint/values/vouchers.js");
    expect(said).toContain("Journal Entry");
    expect(said).toContain("@fixture/ledger/blueprint/values/ledger.js");
  });

  it("refuses a member repeated in one feature's additions, and an empty member, each naming the adder's file", async () => {
    const twice = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Customer", "Supplier"]), again: s.add(l.PartyType, ["Customer"]) }) });
    const said = await refusedAt(modelExit(twice, { mounts: MOUNTED }), "@fixture/parties/blueprint/values/parties.js");
    expect(said).toContain("Customer");
    const empty = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Customer", ""]) }) });
    await refusedAt(modelExit(empty, { mounts: MOUNTED }), "@fixture/parties/blueprint/values/parties.js");
  });

  it("never reads a feature that is installed but not mounted: what it would add wrongly refuses nothing", async () => {
    const b = books({
      invoicing: (s, l) => ({ duplicate: s.add(l.VoucherType, ["Payment Entry"]), closed: s.add(l.AccountType, ["Card"]) }),
      rogue: (s, l) => ({ rogue: s.add(l.VoucherType, ["Rogue Entry"]) }),
    });
    const m = await modelOf(b, { mounts: MOUNTED });
    expect(optionsOf(m.things["gl-entry"]?.fields["account"])).toEqual(["Bank", "Cash"]);
    expect(JSON.stringify(m)).not.toContain("Rogue Entry");
    // And the same wrong additions, mounted, are refused: the control that says the plants are wrong.
    expect(problemsOf(await modelExit(b, { mounts: { ...MOUNTED, invoicing: "invoicing" } })).length).toBeGreaterThan(0);
  });

  it("refuses a feature that needs another feature, but not the set's owner, adding to it: having a need is not depending on the owner", async () => {
    // Leads needs the crm only. Its addition to the crm's set stands; its addition to the ledger's is refused.
    const b = books({ leads: (s, l) => ({ prospect: s.add(l.CrmPartyType, ["Prospect"]), stray: s.add(l.VoucherType, ["Lead Entry"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: { ...MOUNTED, crm: "crm", leads: "leads" } }), "@fixture/leads/blueprint/values/leads.js");
    expect(said).toContain("@fixture/ledger");
    expect(said).toContain("Lead Entry");
    expect(said, "the refusal is about the ledger's set, not the crm's").not.toContain("Prospect");
  });

  it("refuses a feature adding to the app's own open set: no feature depends on the app; it names the adder, the app's file and the member", async () => {
    const b = books({ payments: (s, l) => ({ paymentEntry: s.add(l.VoucherType, ["Payment Entry"]), fax: s.add(l.Channel, ["Fax"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED }), "@fixture/payments/blueprint/values/vouchers.js");
    expect(said).toContain("blueprint/values/channels.ts");
    expect(said).toContain("Fax");
  });

  it("refuses a feature adding to the other owner's set of the same name: adding to the crm's PartyType needs the crm, not the ledger", async () => {
    const b = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Supplier", "Customer"]), wrong: s.add(l.CrmPartyType, ["Vendor"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: { ...MOUNTED, crm: "crm", leads: "leads" } }), "@fixture/parties/blueprint/values/parties.js");
    expect(said).toContain("@fixture/crm");
    expect(said).toContain("Vendor");
  });
});
