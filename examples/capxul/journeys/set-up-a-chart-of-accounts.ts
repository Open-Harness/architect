// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Account `validate` (decisions/CX-ledger.md). Refusal order on create (account/errors.ts):
// ParentAccountNotInCompany, ParentAccountIsLedger, RootAccountIsLedger, RootTypeMissing, RootTypeNotParents, then the
// rule's AccountNameTaken. A child carries its parent's root type, given or not; the report type follows the root type.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AccountCreated, AccountMadeLedger } from "../blueprint/things/account/events.ts";
import {
  AccountHasChildren,
  AccountNameTaken,
  ParentAccountIsLedger,
  ParentAccountNotInCompany,
  RootAccountIsLedger,
  RootTypeMissing,
  RootTypeNotParents,
} from "../blueprint/things/account/errors.ts";
import { machine as accounts } from "../blueprint/things/account/machine.ts";
import create from "../blueprint/things/account/verbs/create.ts";
import get from "../blueprint/things/account/verbs/get.ts";
import makeLedger from "../blueprint/things/account/verbs/make-ledger.ts";

export default Blueprint.journey("set up a chart of accounts", {
  // Acme Trading's chart: Assets (a root group, Asset) > Bank (a ledger, type Bank); Equity > Capital Stock; Expenses >
  // Operating Expenses > Rent. Ada also runs Acme Logistics, which has no accounts. Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a chart",
  steps: (s) => {
    const add = (spec: { readonly accountName: string; readonly parentAccount?: unknown; readonly isGroup: boolean; readonly rootType?: string; readonly accountType?: string }, company: unknown = s.world.company) =>
      s.ada.run(create, { company, ...spec } as never);
    const read = (a: Record<string, unknown>) => [a["company"], a["accountName"], a["parentAccount"] ?? null, a["rootType"], a["reportType"], a["accountType"] ?? null, a["state"]];
    return [
      s.step(
        "Bank reads back a ledger of the type Bank under Assets, on the Balance Sheet",
        s.ada.run(get, { id: s.world.bank }),
        expect(read).toEqual([s.world.company, "Bank", s.world.assets, "Asset", "Balance Sheet", "Bank", "ledger"]),
        noEvents(),
      ),
      s.step(
        "Assets reads back a root group with no parent and no type",
        s.ada.run(get, { id: s.world.assets }),
        expect(read).toEqual([s.world.company, "Assets", null, "Asset", "Balance Sheet", null, "group"]),
      ),
      s.step(
        "Rent, two groups below Expenses, carries Expense, in Profit and Loss",
        s.ada.run(get, { id: s.world.rent }),
        expect(read).toEqual([s.world.company, "Rent", s.world.operating, "Expense", "Profit and Loss", null, "ledger"]),
      ),
      s.step("Bo can't read Bank", s.bo.run(get, { id: s.world.bank }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor add an account to Acme Trading's chart",
        s.bo.run(create, { company: s.world.company, accountName: "Cash", parentAccount: s.world.assets, isGroup: false }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["account.create", "account.create.insert"] }),
      ),
      s.step(
        "Ada adds Cash under Assets, of the type Cash, naming no root type: it takes Asset",
        add({ accountName: "Cash", parentAccount: s.world.assets, isGroup: false, accountType: "Cash" }),
        expect((a) => a.account).toMatch(/^acc_[0-9a-z]+$/),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Asset", "Balance Sheet"]),
        emits(AccountCreated, { account: s.last.account, company: s.world.company, rootType: "Asset" }),
        accounts.isIn(s.last.account, "ledger"),
        spans({ present: ["account.create", "account.create.load", "account.create.insert"] }),
      ),
      s.step(
        "it reads back as she typed it",
        s.ada.run(get, { id: s.last.account }),
        expect(read).toEqual([s.world.company, "Cash", s.world.assets, "Asset", "Balance Sheet", "Cash", "ledger"]),
      ),
      s.step(
        "a root group of the root type Liability is on the Balance Sheet",
        add({ accountName: "Liabilities", isGroup: true, rootType: "Liability" }),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Liability", "Balance Sheet"]),
        accounts.isIn(s.last.account, "group"),
      ),
      s.step(
        "a Payable ledger under it carries Liability",
        add({ accountName: "Creditors", parentAccount: s.last.account, isGroup: false, accountType: "Payable" }),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Liability", "Balance Sheet"]),
      ),
      s.step(
        "and reads back a Payable ledger, Liability",
        s.ada.run(get, { id: s.last.account }),
        expect((a) => [a.accountName, a.rootType, a.accountType, a.state]).toEqual(["Creditors", "Liability", "Payable", "ledger"]),
      ),
      s.step(
        "an Income root group is in Profit and Loss",
        add({ accountName: "Income", isGroup: true, rootType: "Income" }),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Income", "Profit and Loss"]),
      ),
      s.step(
        "a child may name its parent's root type: a Tax ledger beside Rent, Expense",
        add({ accountName: "Utilities", parentAccount: s.world.operating, isGroup: false, rootType: "Expense", accountType: "Tax" }),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Expense", "Profit and Loss"]),
      ),
      s.step(
        "a child under Equity carries Equity, on the Balance Sheet",
        add({ accountName: "Retained Earnings", parentAccount: s.world.equity, isGroup: false }),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Equity", "Balance Sheet"]),
      ),
      s.step(
        "an account under a ledger is refused",
        add({ accountName: "Petty Cash", parentAccount: s.world.bank, isGroup: false }),
        refuses(ParentAccountIsLedger),
        noEvents(),
        spans({ absent: ["account.create.insert"] }),
      ),
      s.step(
        "and so is a group under one, naming another root type: the parent is judged first",
        add({ accountName: "Petty Cash", parentAccount: s.world.rent, isGroup: true, rootType: "Income" }),
        refuses(ParentAccountIsLedger),
      ),
      s.step("a root that isn't a group is refused", add({ accountName: "Suspense", isGroup: false, rootType: "Asset" }), refuses(RootAccountIsLedger), noEvents()),
      s.step("even with no root type: its being a ledger is judged first", add({ accountName: "Suspense", isGroup: false }), refuses(RootAccountIsLedger)),
      s.step("a root group must name its root type", add({ accountName: "Suspense", isGroup: true }), refuses(RootTypeMissing), noEvents()),
      s.step(
        "a child naming another root type than its parent's is refused, carrying the parent's",
        add({ accountName: "Loans", parentAccount: s.world.assets, isGroup: false, rootType: "Liability" }),
        refuses(RootTypeNotParents, { rootType: "Asset" }),
        noEvents(),
      ),
      s.step(
        "two levels down too: under Rent's group it carries Expense",
        add({ accountName: "Sales", parentAccount: s.world.operating, isGroup: true, rootType: "Income" }),
        refuses(RootTypeNotParents, { rootType: "Expense" }),
      ),
      s.step("a second Bank is refused, under any parent", add({ accountName: "Bank", parentAccount: s.world.equity, isGroup: false }), refuses(AccountNameTaken), noEvents()),
      s.step("and at the root", add({ accountName: "Rent", isGroup: true, rootType: "Expense" }), refuses(AccountNameTaken)),
      s.step(
        "a taken name under a ledger is refused for the ledger first",
        add({ accountName: "Cash", parentAccount: s.world.bank, isGroup: false }),
        refuses(ParentAccountIsLedger),
      ),
      s.step(
        "Ada starts Acme Logistics' chart with its own Assets: the name is that company's to use",
        add({ accountName: "Assets", isGroup: true, rootType: "Asset" }, s.world.otherCompany),
        expect((a) => [a.rootType, a.reportType]).toEqual(["Asset", "Balance Sheet"]),
        emits(AccountCreated, { account: s.last.account, company: s.world.otherCompany, rootType: "Asset" }),
      ),
      s.step(
        "an Acme Trading account under Acme Logistics' Assets is refused",
        add({ accountName: "Float", parentAccount: s.last.account, isGroup: false }),
        refuses(ParentAccountNotInCompany),
        noEvents(),
        spans({ absent: ["account.create.insert"] }),
      ),
      s.step(
        "Acme Logistics adds its own Bank under it",
        add({ accountName: "Bank", parentAccount: s.last.account, isGroup: false, accountType: "Bank" }, s.world.otherCompany),
        expect((a) => a.rootType).toBe("Asset"),
      ),
      s.step(
        "an Acme Trading account under that ledger, naming another root type, is refused for the company first",
        add({ accountName: "Float", parentAccount: s.last.account, isGroup: false, rootType: "Income" }),
        refuses(ParentAccountNotInCompany),
      ),
      s.step(
        "Ada can't turn the group above Rent into a ledger while Rent is under it",
        s.ada.run(makeLedger, { account: s.world.operating }),
        refuses(AccountHasChildren),
        noEvents(),
        spans({ absent: ["account.make-ledger.update"] }),
      ),
      s.step("nor Expenses, with that group under it", s.ada.run(makeLedger, { account: s.world.expenses }), refuses(AccountHasChildren)),
      s.step("nor Assets", s.ada.run(makeLedger, { account: s.world.assets }), refuses(AccountHasChildren)),
      s.step(
        "a ledger is already one",
        s.ada.run(makeLedger, { account: s.world.bank }),
        refuses(accounts.notFrom, { state: "ledger" }),
        noEvents(),
      ),
      s.step(
        "Ada adds an empty group under Assets",
        add({ accountName: "Prepayments", parentAccount: s.world.assets, isGroup: true }),
        accounts.isIn(s.last.account, "group"),
      ),
      s.step("Bo can't turn it into a ledger", s.bo.run(makeLedger, { account: s.last.account }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada turns it into a ledger: nothing is under it",
        s.ada.run(makeLedger, { account: s.last.account }),
        expect((a) => a.account).toMatch(/^acc_/),
        emits(AccountMadeLedger, { account: s.last.account }),
        accounts.isIn(s.last.account, "ledger"),
        spans({ present: ["account.make-ledger.update"] }),
      ),
      s.step(
        "it reads back a ledger, everything else as it was",
        s.ada.run(get, { id: s.last.account }),
        expect(read).toEqual([s.world.company, "Prepayments", s.world.assets, "Asset", "Balance Sheet", null, "ledger"]),
      ),
      s.step(
        "the group above Rent still reads back a group",
        s.ada.run(get, { id: s.world.operating }),
        expect(read).toEqual([s.world.company, "Operating Expenses", s.world.expenses, "Expense", "Profit and Loss", null, "group"]),
      ),
    ];
  },
});
