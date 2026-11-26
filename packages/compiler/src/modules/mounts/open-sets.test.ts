// #1132 (CX-open-sets): a value declared open (`Blueprint.oneOf.open`) that features depending on its owner add members to
// (`Blueprint.oneOf.add`). The compiled model holds, on every field that holds the set, the union of the members of the owner and of the
// mounted features that add, the owner's own first and then the rest by name; a reference (`Blueprint.refAny.of(set)`) holds a kind from the
// same union. An installed feature that isn't mounted adds nothing. What the compiler refuses is open-sets-refused.test.ts; the scratch books
// are ./testing.ts. Written by the checks author for Goal 16; the builder never edits this file and only removes lines from
// `expected-failing/open-sets.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import type { FieldModel, Model } from "#modules/model/types.js";
import { MOUNTED, OWN_CHANNELS, books, modelOf, optionsOf, surface } from "./testing.ts";

// What the fixtures declare, so what every field holding the set must hold: the ledger's own, then the four the mounted features add, by name.
const VOUCHERS = ["Journal Entry", "Contra Entry", "Expense Claim", "Payment Entry", "Salary Slip"];
const PARTIES = ["Customer", "Employee", "Supplier"];

const choice = (options: ReadonlyArray<string>) => ({ type: "schema", format: "choice", options, open: true });
const reference = (options: ReadonlyArray<string>) => ({ type: "schema", format: "ref-any", options });

/** Every field of the model that holds the voucher set, with where it is: the ledger's thing, its event, its operation's payload, the app's own thing. */
const voucherFields = (m: Model): Readonly<Record<string, FieldModel | undefined>> => ({
  "gl-entry field voucherType": m.things["gl-entry"]?.fields["voucherType"],
  "gl-entry event Posted field voucherType": m.things["gl-entry"]?.events["Posted"]?.["voucherType"],
  "gl-entry.post payload voucherType": m.operations["gl-entry.post"]?.payload["voucherType"],
  "posting field voucherType": m.things["posting"]?.fields["voucherType"],
  "posting optional field alsoType": m.things["posting"]?.fields["alsoType"],
});
const referenceFields = (m: Model) => ({
  voucher: [m.things["gl-entry"]?.fields["voucher"], m.things["gl-entry"]?.events["Posted"]?.["voucher"], m.operations["gl-entry.post"]?.payload["voucher"]],
  party: [m.things["gl-entry"]?.fields["party"], m.operations["gl-entry.post"]?.payload["party"], m.things["posting"]?.fields["party"]],
});

describe("#1132: an open set holds the members of the features that add to it", () => {
  it("every field holding an open set holds the owner's members, then each mounted feature's, by name; payroll adds through payments", async () => {
    const m = await modelOf(books(), { mounts: MOUNTED });
    for (const [where, field] of Object.entries(voucherFields(m))) expect(field?.value, where).toMatchObject(choice(VOUCHERS));
    expect(optionsOf(m.things["gl-entry"]?.fields["voucherType"]), "an option in the model is never repeated").toEqual(VOUCHERS);
    // A set whose owner declares no members of its own is all its features'.
    expect(m.things["gl-entry"]?.fields["party"]?.value, "party holds PartyType's kinds").toMatchObject(reference(PARTIES));
  });

  it("a reference to an open set holds a kind from the same union, wherever it is used", async () => {
    const m = await modelOf(books(), { mounts: MOUNTED });
    const { voucher, party } = referenceFields(m);
    for (const [i, f] of voucher.entries()) expect(f?.value, `voucher ${i}`).toMatchObject(reference(VOUCHERS));
    for (const [i, f] of party.entries()) expect(f?.value, `party ${i}`).toMatchObject(reference(PARTIES));
  });

  it("a feature that is installed but not mounted adds nothing anywhere in the model; mounted, it adds its member and moves the hashes", async () => {
    const without = await modelOf(books(), { mounts: MOUNTED });
    expect(JSON.stringify(without), "nothing in the model names an unmounted feature's member").not.toContain("Sales Invoice");
    const withIt = await modelOf(books(), { mounts: { ...MOUNTED, invoicing: "invoicing" } });
    const all = ["Journal Entry", "Contra Entry", "Expense Claim", "Payment Entry", "Salary Slip", "Sales Invoice"];
    for (const [where, field] of Object.entries(voucherFields(withIt))) expect(field?.value, where).toMatchObject(choice(all));
    for (const [i, f] of referenceFields(withIt).voucher.entries()) expect(f?.value, `voucher ${i}`).toMatchObject(reference(all));
    // A set's members are part of what an operation takes, so the operation and the thing are not what they were.
    expect(withIt.operations["gl-entry.post"]?.hash).not.toBe(without.operations["gl-entry.post"]?.hash);
    expect(withIt.things["gl-entry"]?.hash).not.toBe(without.things["gl-entry"]?.hash);
    // What the invoicing feature adds to is the voucher set only: the party set is as it was.
    expect(withIt.things["gl-entry"]?.fields["party"]?.value).toEqual(without.things["gl-entry"]?.fields["party"]?.value);
  });

  it("the order is the owner's members, then the added ones by name: never the mounts' order, so renaming a mount moves nothing", async () => {
    // Mounted as `banking`, payments sorts before expenses: by mount, Payment Entry would come before Expense Claim.
    const renamed = await modelOf(books(), { mounts: { ledger: "ledger", banking: "payments", expenses: "expenses", parties: "parties", payroll: "payroll" } });
    expect(renamed.things["gl-entry"]?.fields["voucherType"]?.value).toMatchObject(choice(VOUCHERS));
    const plain = await modelOf(books(), { mounts: MOUNTED });
    expect(renamed.operations["gl-entry.post"]?.hash).toBe(plain.operations["gl-entry.post"]?.hash);
    expect(renamed.things["gl-entry"]?.hash).toBe(plain.things["gl-entry"]?.hash);
  });

  it("with only the owner mounted, an open set holds the owner's members, and one with none of its own holds none", async () => {
    const m = await modelOf(books(), { mounts: { ledger: "ledger" } });
    expect(m.things["gl-entry"]?.fields["voucherType"]?.value).toMatchObject(choice(["Journal Entry", "Contra Entry"]));
    expect(m.things["gl-entry"]?.fields["voucher"]?.value).toMatchObject(reference(["Journal Entry", "Contra Entry"]));
    expect(m.things["gl-entry"]?.fields["party"]?.value).toMatchObject(reference([]));
    for (const word of ["Payment Entry", "Expense Claim", "Salary Slip", "Customer", "Supplier", "Employee"]) expect(JSON.stringify(m), word).not.toContain(word);
  });

  it("the app may add to a feature's open set: it depends on every feature it mounts; its members sort with the rest, by code unit, never by locale", async () => {
    const b = books();
    // "\u{1F600} Entry" sorts before "\uFB00 Entry" by code unit (a surrogate, 0xD83D, is below 0xFB00), after it by code point.
    const opening = { path: "values/vouchers.ts", exports: { opening: b.s.add(b.ledger.VoucherType, ["\uFB00 Entry", "eBay Order", "\u{1F600} Entry", "Opening Entry"]) } };
    const m = await modelOf(b, { mounts: MOUNTED, files: [opening] });
    expect(m.things["gl-entry"]?.fields["voucherType"]?.value).toMatchObject(
      choice(["Journal Entry", "Contra Entry", "Expense Claim", "Opening Entry", "Payment Entry", "Salary Slip", "eBay Order", "\u{1F600} Entry", "\uFB00 Entry"]),
    );
  });

  it("leaves closed values as they were: a oneOf is not open, and a refAny() still names a declaration", async () => {
    const m = await modelOf(books(), { mounts: MOUNTED });
    expect(m.things["gl-entry"]?.fields["account"]?.value).toEqual({ type: "schema", format: "choice", options: ["Bank", "Cash"] });
    expect(m.things["gl-entry"]?.fields["source"]?.value).toEqual({ type: "schema", format: "ref-any" });
    // The set's own declaration says it is open, and keeps only the owner's members: what features add is the model's to hold.
    const s = surface();
    expect(s.open(["Journal Entry", "Contra Entry"]).meta).toMatchObject({ type: "schema", format: "choice", options: ["Journal Entry", "Contra Entry"], open: true });
    expect(Blueprint.oneOf(["Journal Entry"]).meta).not.toHaveProperty("open");
  });

  it("a set is its owner's and its export's: the crm's PartyType and the ledger's are two sets, though both are `PartyType` in `values/ledger.js`", async () => {
    const m = await modelOf(books(), { mounts: { ...MOUNTED, crm: "crm", leads: "leads" } });
    // Leads needs the crm and adds to the crm's set; parties needs the ledger and adds to the ledger's. Neither member crosses.
    expect(m.things["contact"]?.fields["partyType"]?.value, "the crm's set").toMatchObject(choice(["Lead", "Prospect"]));
    expect(optionsOf(m.things["contact"]?.fields["partyType"]), "the crm's set holds only its own and its adders'").toEqual(["Lead", "Prospect"]);
    for (const f of referenceFields(m).party) expect(optionsOf(f), "the ledger's party set holds only its own adders'").toEqual(PARTIES);
    for (const [where, field] of Object.entries(voucherFields(m))) expect(field?.value, where).toMatchObject(choice(VOUCHERS));
  });

  it("an open set the app declares is owned by the app: it holds the app's members in the app's order, and no feature's", async () => {
    for (const mounts of [MOUNTED, { ledger: "ledger" as const }, { ...MOUNTED, crm: "crm" as const, leads: "leads" as const }]) {
      const m = await modelOf(books(), { mounts });
      expect(m.things["posting"]?.fields["channel"]?.value, Object.keys(mounts).join(", ")).toMatchObject(choice(OWN_CHANNELS));
      expect(optionsOf(m.things["posting"]?.fields["channel"])).toEqual(OWN_CHANNELS);
    }
    // The app, as the owner, may add to its own set from another of its values files: its own first, then what it adds.
    const b = books();
    const email = { path: "values/more-channels.ts", exports: { email: b.s.add(b.ledger.Channel, ["Email"]) } };
    const m = await modelOf(b, { mounts: MOUNTED, files: [email] });
    expect(optionsOf(m.things["posting"]?.fields["channel"])).toEqual([...OWN_CHANNELS, "Email"]);
  });

  it("a list of an open set, or of a reference to one, holds the same union in its item", async () => {
    const m = await modelOf(books(), { mounts: MOUNTED });
    expect(m.things["posting"]?.fields["kinds"]?.value, "a list of the voucher set").toMatchObject({ type: "schema", format: "list", item: choice(VOUCHERS) });
    expect(m.things["posting"]?.fields["vouchers"]?.value, "a list of voucher references").toMatchObject({ type: "schema", format: "list", item: reference(VOUCHERS) });
    // A list of anything else is as it was: no item.
    const plain = await modelOf(books(), { mounts: { ledger: "ledger" } });
    expect(plain.things["posting"]?.fields["kinds"]?.value).toMatchObject({ type: "schema", format: "list", item: choice(["Journal Entry", "Contra Entry"]) });
  });

  it("a need with `when` counts once the mount picks it: bookkeeping, picked to post, adds to the ledger's set", async () => {
    const m = await modelOf(books(), { mounts: { ...MOUNTED, bookkeeping: "bookkeeping" }, posting: ["bookkeeping"] });
    expect(m.things["gl-entry"]?.fields["voucherType"]?.value).toMatchObject(choice(["Journal Entry", "Contra Entry", "Expense Claim", "Opening Balance", "Payment Entry", "Salary Slip"]));
  });
});
