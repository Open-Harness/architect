// #1132 (CX-open-sets): what the compiler refuses about open sets, each naming the file that declared it. Only a feature that depends on the
// set's owner (directly or through another feature it needs), or the app, adds to a set; only an open set takes members; a member is a name,
// and is in a set once. An installed feature that isn't mounted is never read, so what it would add can't be refused either. What the model
// holds is open-sets.test.ts; the scratch books are ./testing.ts. Written by the checks author for Goal 16; the builder never edits this file
// and only removes lines from `expected-failing/open-sets-refused.txt`.
import { Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ALL, MOUNTED, books, modelExit, modelOf, optionsOf, problemsOf, type Ledger, type Name, type Plant } from "./testing.ts";

/** The one problem naming `where`: a refusal must name the file that made it. */
const refusedAt = async (exit: ReturnType<typeof modelExit>, where: string) => {
  const problems = problemsOf(await exit);
  expect(problems.length, "the blueprint is refused").toBeGreaterThan(0);
  // An app file is named as itself, never as a path inside some package (`@fixture/x/blueprint/...`).
  const at = where.startsWith("blueprint/") ? new RegExp(`(^|[\\s"'\`(])${where.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`) : undefined;
  const named = problems.filter((p) => (at === undefined ? p.includes(where) : at.test(p)));
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
    expect(said).toContain("Blueprint.oneOf.open");
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
    expect(said, "it names the one member the owner has, not the rest of the addition").not.toContain("Payment Entry");
  });

  it("refuses a member repeated in one feature's additions, and an empty member, each naming the adder's file", async () => {
    const twice = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Customer", "Supplier"]), again: s.add(l.PartyType, ["Customer"]) }) });
    const said = await refusedAt(modelExit(twice, { mounts: MOUNTED }), "@fixture/parties/blueprint/values/parties.js");
    expect(said).toContain("Customer");
    const empty = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Customer", ""]) }) });
    await refusedAt(modelExit(empty, { mounts: MOUNTED }), "@fixture/parties/blueprint/values/parties.js");
    // Repeated inside one addition, too.
    const inOne = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Customer", "Supplier", "Customer"]) }) });
    expect(await refusedAt(modelExit(inOne, { mounts: MOUNTED }), "@fixture/parties/blueprint/values/parties.js")).toContain("Customer");
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
    expect(said).toMatch(/(^|[\s"'`(])blueprint\/values\/channels\.ts/);
    expect(said).toContain("Fax");
  });

  it("refuses a feature adding to the other owner's set of the same name: adding to the crm's PartyType needs the crm, not the ledger", async () => {
    const b = books({ parties: (s, l) => ({ parties: s.add(l.PartyType, ["Supplier", "Customer"]), wrong: s.add(l.CrmPartyType, ["Vendor"]) }) });
    const said = await refusedAt(modelExit(b, { mounts: { ...MOUNTED, crm: "crm", leads: "leads" } }), "@fixture/parties/blueprint/values/parties.js");
    expect(said).toContain("@fixture/crm");
    expect(said).toContain("Vendor");
  });

  it("refuses the app adding a member a feature adds, naming both files and the member", async () => {
    const b = books();
    const mine = { path: "values/vouchers.ts", exports: { mine: b.s.add(b.ledger.VoucherType, ["Payment Entry"]) } };
    const problems = problemsOf(await modelExit(b, { mounts: MOUNTED, files: [mine] }));
    const said = problems.filter((p) => p.includes("Payment Entry"));
    expect(said, problems.join("\n")).toHaveLength(1);
    expect(said[0]).toContain("@fixture/payments/blueprint/values/vouchers.js");
    expect(said[0]).toMatch(/(^|[\s"'`(])blueprint\/values\/vouchers\.ts/);
  });

  it("refuses the app's own empty member, repeated member and member the owner has, as it refuses a feature's, naming the app's file", async () => {
    for (const members of [["Opening Entry", ""], ["Opening Entry", "Opening Entry"], ["Opening Entry", "Journal Entry"]]) {
      const b = books();
      const mine = { path: "values/vouchers.ts", exports: { mine: b.s.add(b.ledger.VoucherType, members) } };
      const said = await refusedAt(modelExit(b, { mounts: MOUNTED, files: [mine] }), "blueprint/values/vouchers.ts");
      expect(said, JSON.stringify(members)).not.toContain("not a refusal");
    }
  });

  it("refuses a feature whose need on the owner has a `when` its mount didn't pick: unpicked, it doesn't depend on the owner", async () => {
    const said = await refusedAt(modelExit(books(), { mounts: { ...MOUNTED, bookkeeping: "bookkeeping" } }), "@fixture/bookkeeping/blueprint/values/bookkeeping.js");
    expect(said).toContain("@fixture/ledger");
    expect(said).toContain("Opening Balance");
  });

  it("refuses the app adding to an open set of a feature that is installed but not mounted, naming the app's file and the package", async () => {
    const b = books();
    const mine = { path: "values/contacts.ts", exports: { mine: b.s.add(b.ledger.CrmPartyType, ["Partner"]) } };
    const said = await refusedAt(modelExit(b, { mounts: MOUNTED, files: [mine] }), "blueprint/values/contacts.ts");
    expect(said).toContain("@fixture/crm");
    expect(said).toContain("Partner");
    // And to one with no member of its own.
    const c = books();
    const empty = { path: "values/segments.ts", exports: { mine: c.s.add(c.ledger.Segment, ["Retail"]) } };
    const also = await refusedAt(modelExit(c, { mounts: MOUNTED, files: [empty] }), "blueprint/values/segments.ts");
    expect(also).toContain("@fixture/crm");
  });

  it("refuses an owner's own set with an empty member or a member twice, by a feature or by the app, naming the declaring file", async () => {
    for (const members of [["Cheque", ""], ["", "Cheque"], ["Cheque", "Cheque"], ["Cheque", "Bank", "Cheque"]]) {
      const b = books({}, { payments: (s) => ({ Bad: Blueprint.value(s.open(members)) }) });
      const said = await refusedAt(modelExit(b, { mounts: MOUNTED }), "@fixture/payments/blueprint/values/planted.js");
      expect(said, JSON.stringify(members)).toContain("Bad");
      const a = books();
      const app = { path: "values/bad.ts", exports: { Bad: Blueprint.value(a.s.open(members)) } };
      expect(await refusedAt(modelExit(a, { mounts: MOUNTED, files: [app] }), "blueprint/values/bad.ts"), JSON.stringify(members)).toContain("Bad");
    }
  });

  it("judges every pair of feature and open set by the needs the model reports: a feature adds only to its own sets and its needs' sets, at any depth", async () => {
    // Every feature but invoicing is mounted, bookkeeping without picking `posting`; rogue and bookkeeping add nothing of their own here.
    const quiet = { rogue: () => ({}), bookkeeping: () => ({}) };
    const base = await modelOf(books(quiet), { mounts: ALL });
    const needs = new Map(Object.entries(base.mounts ?? {}).map(([n, m]) => [n, (m.needs ?? []).map((x) => x.replace(/^feature:/, ""))]));
    const reaches = (from: string, to: string, seen = new Set<string>()): boolean =>
      (needs.get(from) ?? []).some((n) => n === to || (!seen.has(n) && (seen.add(n), reaches(n, to, seen))));
    // The graph has every shape the rule must tell apart: through another feature, an owner that needs a feature, siblings, a `when` not picked.
    expect([
      reaches("payroll", "ledger"), reaches("reports", "ledger"), reaches("projects", "crm"), reaches("crm", "projects"), reaches("expenses", "payments"),
      reaches("payments", "expenses"), reaches("bookkeeping", "ledger"), reaches("audit", "bookkeeping"), reaches("audit", "ledger"), reaches("ledger", "payroll"),
    ]).toEqual([true, true, true, false, false, false, false, true, false, false]);
    // Each set, its owner (a mount, or the app), and a field that holds it. The app depends on every feature it mounts; no feature depends on the app.
    const sets: ReadonlyArray<readonly [keyof Ledger, string, string, string]> = [
      ["VoucherType", "ledger", "gl-entry", "voucherType"], ["CrmPartyType", "crm", "contact", "partyType"],
      ["PaymentMethod", "payments", "payment", "method"], ["ProjectKind", "projects", "project", "kind"], ["Channel", "app", "posting", "channel"],
    ];
    const ownerNamed = (owner: string) => (p: string) => (owner === "app" ? /(^|[\s"'`(])blueprint\/values\/channels\.ts/.test(p) : p.includes(`@fixture/${owner}`));
    const wrong: Array<string> = [];
    for (const adder of [...Object.keys(ALL), "app"] as ReadonlyArray<Name | "app">) {
      for (const [set, owner, thing, field] of sets) {
        const member = `Planted by ${adder}`;
        const plant: Plant = (s, l) => ({ planted: s.add(l[set], [member]) });
        const b = books(quiet, adder === "app" ? {} : ({ [adder]: plant } as Partial<Record<Name, Plant>>));
        const adderFile = adder === "app" ? "blueprint/values/planted.ts" : `@fixture/${adder}/blueprint/values/planted.js`;
        const exit = await modelExit(b, { mounts: ALL, files: adder === "app" ? [{ path: "values/planted.ts", exports: plant(b.s, b.ledger) }] : [] });
        const problems = problemsOf(exit);
        const may = adder === owner || adder === "app" || (owner !== "app" && reaches(adder, owner));
        const pair = `${adder} adding to ${owner}'s ${set}`;
        if (may) {
          const options = Exit.isSuccess(exit) ? optionsOf(exit.value.things[thing]?.fields[field]) : undefined;
          if (!options?.includes(member)) wrong.push(`${pair} should stand: ${problems.join(" | ") || JSON.stringify(options)}`);
        } else {
          const named = problems.filter((p) => p.includes(adderFile) && p.includes(member) && ownerNamed(owner)(p));
          if (named.length !== 1 || problems.length !== 1) wrong.push(`${pair} should be refused, once, naming the adder's file, the member and the owner: ${problems.join(" | ") || "nothing refused"}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
