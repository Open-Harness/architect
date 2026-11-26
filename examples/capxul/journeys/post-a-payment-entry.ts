// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Payment Entry submit and cancel with no invoice (decisions/CX-parties-payments.md). Submit refuses
// PaymentPostingDateOutsideFiscalYear before PartyDisabled, then posts two ledger lines: the party's first, on its
// account with the party type and party, credited on Receive and debited on Pay; then the bank's, with no party. Cancel
// marks both cancelled and posts a reversal of each, debit and credit swapped, also cancelled. A party's balance is the
// sum of the lines not cancelled with it as their party, posted on or before the day: debit less credit.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PaymentEntryCancelled, PaymentEntrySubmitted } from "../blueprint/things/payment-entry/events.ts";
import { PartyDisabled, PaymentPostingDateOutsideFiscalYear } from "../blueprint/things/payment-entry/errors.ts";
import { machine as payments } from "../blueprint/things/payment-entry/machine.ts";
import draft from "../blueprint/things/payment-entry/verbs/create.ts";
import submit from "../blueprint/things/payment-entry/verbs/submit.ts";
import cancel from "../blueprint/things/payment-entry/verbs/cancel.ts";
import get from "../blueprint/things/payment-entry/verbs/get.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import balance from "../blueprint/things/account/verbs/balance.ts";
import customerBalance from "../blueprint/things/customer/verbs/balance.ts";
import supplierBalance from "../blueprint/things/supplier/verbs/balance.ts";
import createSupplier from "../blueprint/things/supplier/verbs/create.ts";
import createCustomer from "../blueprint/things/customer/verbs/create.ts";
import disableCustomer from "../blueprint/things/customer/verbs/disable.ts";
import disableSupplier from "../blueprint/things/supplier/verbs/disable.ts";
import enableSupplier from "../blueprint/things/supplier/verbs/enable.ts";
import createYear from "../blueprint/things/fiscal-year/verbs/create.ts";

const USDC = 1_000_000n;
const ADVANCE = 500n * USDC;
type Gl = {
  readonly company: string; readonly account: string; readonly costCenter: string; readonly postingDate: string; readonly debit: bigint; readonly credit: bigint;
  readonly partyType?: string; readonly party?: string; readonly voucherType: string; readonly voucherId: string; readonly isCancelled: boolean;
};
const row = (i: Gl) =>
  [i.company, i.account, i.costCenter, i.postingDate, i.debit, i.credit, i.partyType ?? null, i.party ?? null, i.voucherType, i.voucherId, i.isCancelled];
const rows = (p: { readonly items: ReadonlyArray<Gl> }) => p.items.map(row);
// A line without its voucher id, for a page read by voucher: the read's filter is what pins the voucher.
const bare = (i: Gl) => row(i).filter((_, n) => n !== 9);
const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];

export default Blueprint.journey("post a payment entry", {
  // Acme Trading's chart: Assets > Bank (Bank) and Debtors (Receivable); Liabilities > Creditors (Payable); cost
  // centers Acme Trading > Operations; the fiscal year 2026. Its customer Kibo Stores and supplier Mara Office Rentals.
  // A draft of 500 USDC received from Kibo Stores on 10 February 2026, Debtors to Bank, in Operations: an advance.
  // Ada also runs Acme Logistics, which has no fiscal year. Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a received advance",
  steps: (s) => {
    const line = (account: unknown, postingDate: string, debit: bigint, credit: bigint, partyType: string | null, party: unknown, voucher: unknown, isCancelled: boolean) =>
      [s.world.company, account, s.world.costCenter, postingDate, debit, credit, partyType, party, "Payment Entry", voucher, isCancelled];
    const payment = (spec: { readonly paymentType: string; readonly postingDate: string; readonly partyType: string; readonly party: unknown; readonly paidFrom: unknown; readonly paidTo: unknown; readonly paidAmount: bigint }) =>
      s.ada.run(draft, { company: s.world.company, costCenter: s.world.costCenter, ...spec } as never);
    const fromKibo = (postingDate: string, paidAmount: bigint) =>
      payment({ paymentType: "Receive", postingDate, partyType: "Customer", party: s.world.customer, paidFrom: s.world.debtors, paidTo: s.world.bank, paidAmount });
    const plain = (account: unknown, postingDate: string, debit: bigint, credit: bigint, partyType: string | null, party: unknown, isCancelled: boolean) =>
      [s.world.company, account, s.world.costCenter, postingDate, debit, credit, partyType, party, "Payment Entry", isCancelled];
    const toMara = (postingDate: string, paidAmount: bigint) =>
      payment({ paymentType: "Pay", postingDate, partyType: "Supplier", party: s.world.supplier, paidFrom: s.world.bank, paidTo: s.world.creditors, paidAmount });
    return [
      // Submit.
      s.step("Bo can't submit it", s.bo.run(submit, { paymentEntry: s.world.paymentEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada can't cancel it while it is a draft",
        s.ada.run(cancel, { paymentEntry: s.world.paymentEntry }),
        refuses(payments.notFrom, { state: "draft" }),
        noEvents(),
        spans({ absent: ["payment-entry.cancel.reverse"] }),
      ),
      s.step(
        "Ada submits it: two ledger lines",
        s.ada.run(submit, { paymentEntry: s.world.paymentEntry }),
        expect((a) => [a.paymentEntry, a.posted]).toEqual([s.world.paymentEntry, 2n]),
        emits(PaymentEntrySubmitted, { paymentEntry: s.world.paymentEntry, posted: 2n }),
        payments.isIn(s.world.paymentEntry, "submitted"),
        spans({ present: ["payment-entry.submit", "payment-entry.submit.load", "payment-entry.submit.post"] }),
      ),
      s.step(
        "it reads back submitted, as it was drafted",
        s.ada.run(get, { id: s.world.paymentEntry }),
        expect((a) => [a.paymentType, a.postingDate, a.partyType, a.party, a.paidFrom, a.paidTo, a.paidAmount, a.state]).toEqual([
          "Receive", "2026-02-10", "Customer", s.world.customer, s.world.debtors, s.world.bank, ADVANCE, "submitted",
        ]),
      ),
      s.step(
        "Debtors' ledger holds the party's credit, with Kibo Stores as its party",
        s.ada.run(ledger, { account: s.world.debtors }),
        expect(rows).toEqual([line(s.world.debtors, "2026-02-10", 0n, ADVANCE, "Customer", s.world.customer, s.world.paymentEntry, false)]),
        noEvents(),
      ),
      s.step(
        "and Bank's the debit, with no party",
        s.ada.run(ledger, { account: s.world.bank }),
        expect(rows).toEqual([line(s.world.bank, "2026-02-10", ADVANCE, 0n, null, null, s.world.paymentEntry, false)]),
      ),
      s.step("Bank's balance is the advance", s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }), expect(sums).toEqual([ADVANCE, 0n, ADVANCE])),
      s.step("Debtors' is the advance owed back, negative", s.ada.run(balance, { account: s.world.debtors, onDay: "2026-12-31" }), expect(sums).toEqual([0n, ADVANCE, -ADVANCE])),
      s.step("and Assets, which holds both, nets to nothing", s.ada.run(balance, { account: s.world.assets, onDay: "2026-12-31" }), expect(sums).toEqual([ADVANCE, ADVANCE, 0n])),
      s.step(
        "Kibo Stores' balance is the advance received, negative",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        expect(sums).toEqual([0n, ADVANCE, -ADVANCE]),
        expect((a) => a.customer).toBe(s.world.customer),
        noEvents(),
        spans({ present: ["customer.balance", "customer.balance.sum"] }),
      ),
      s.step("on the payment's own day too", s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-02-10" }), expect(sums).toEqual([0n, ADVANCE, -ADVANCE])),
      s.step("but not the day before", s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-02-09" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step(
        "Mara Office Rentals, paid nothing, has no balance",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([0n, 0n, 0n]),
      ),
      s.step("Bo can't read Kibo Stores' balance", s.bo.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada can't submit it twice",
        s.ada.run(submit, { paymentEntry: s.world.paymentEntry }),
        refuses(payments.notFrom, { state: "submitted" }),
        noEvents(),
        spans({ absent: ["payment-entry.submit.post"] }),
      ),

      // Cancel.
      s.step("Bo can't cancel it", s.bo.run(cancel, { paymentEntry: s.world.paymentEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada cancels it: two reversing lines",
        s.ada.run(cancel, { paymentEntry: s.world.paymentEntry }),
        expect((a) => [a.paymentEntry, a.reversed]).toEqual([s.world.paymentEntry, 2n]),
        emits(PaymentEntryCancelled, { paymentEntry: s.world.paymentEntry, reversed: 2n }),
        payments.isIn(s.world.paymentEntry, "cancelled"),
        spans({ present: ["payment-entry.cancel", "payment-entry.cancel.load", "payment-entry.cancel.reverse"] }),
      ),
      s.step(
        "Debtors' ledger keeps the credit and adds its reversal, a debit with the same party, both cancelled",
        s.ada.run(ledger, { account: s.world.debtors }),
        expect(rows).toEqual([
          line(s.world.debtors, "2026-02-10", 0n, ADVANCE, "Customer", s.world.customer, s.world.paymentEntry, true),
          line(s.world.debtors, "2026-02-10", ADVANCE, 0n, "Customer", s.world.customer, s.world.paymentEntry, true),
        ]),
      ),
      s.step(
        "Bank's the same, the other way, with no party",
        s.ada.run(ledger, { account: s.world.bank }),
        expect(rows).toEqual([
          line(s.world.bank, "2026-02-10", ADVANCE, 0n, null, null, s.world.paymentEntry, true),
          line(s.world.bank, "2026-02-10", 0n, ADVANCE, null, null, s.world.paymentEntry, true),
        ]),
      ),
      s.step("Kibo Stores' balance is nothing again", s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step("and Bank's", s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step("and Debtors'", s.ada.run(balance, { account: s.world.debtors, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step(
        "it reads back cancelled",
        s.ada.run(get, { id: s.world.paymentEntry }),
        expect((a) => [a.paidAmount, a.state]).toEqual([ADVANCE, "cancelled"]),
      ),
      s.step("it can't be cancelled twice", s.ada.run(cancel, { paymentEntry: s.world.paymentEntry }), refuses(payments.notFrom, { state: "cancelled" }), noEvents()),
      s.step("nor submitted again", s.ada.run(submit, { paymentEntry: s.world.paymentEntry }), refuses(payments.notFrom, { state: "cancelled" }), noEvents()),

      // Pay: an advance to a supplier.
      s.step("Ada drafts 200 USDC paid to Mara Office Rentals on 5 March", toMara("2026-03-05", 200n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "and submits it: two ledger lines",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        expect((a) => a.posted).toBe(2n),
        emits(PaymentEntrySubmitted, { paymentEntry: s.last.paymentEntry, posted: 2n }),
      ),
      s.step(
        "Creditors' ledger, read by this payment, holds the party's debit, with Mara Office Rentals as its party",
        s.ada.run(ledger, { account: s.world.creditors, voucherId: s.last.paymentEntry }),
        expect((p) => p.items.map(bare)).toEqual([plain(s.world.creditors, "2026-03-05", 200n * USDC, 0n, "Supplier", s.world.supplier, false)]),
      ),
      s.step(
        "Bank's ledger, read by the same payment, holds the credit, with no party",
        s.ada.run(ledger, { account: s.world.bank, voucherId: s.last.items[0].voucherId }),
        expect((p) => p.items.map(bare)).toEqual([plain(s.world.bank, "2026-03-05", 0n, 200n * USDC, null, null, false)]),
      ),
      s.step("it is Creditors' only line", s.ada.run(ledger, { account: s.world.creditors }), expect((p) => p.items.length).toBe(1)),
      s.step("and Bank holds three", s.ada.run(ledger, { account: s.world.bank }), expect((p) => p.items.length).toBe(3)),
      s.step(
        "Mara Office Rentals' balance is the advance paid, positive",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([200n * USDC, 0n, 200n * USDC]),
        expect((a) => a.supplier).toBe(s.world.supplier),
        spans({ present: ["supplier.balance", "supplier.balance.sum"] }),
      ),
      s.step("Liabilities, above Creditors, holds it", s.ada.run(balance, { account: s.world.liabilities, onDay: "2026-12-31" }), expect(sums).toEqual([200n * USDC, 0n, 200n * USDC])),
      s.step("Bank is 200 USDC down", s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 200n * USDC, -200n * USDC])),
      s.step("Kibo Stores' balance doesn't move", s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step("Bo can't read Mara Office Rentals' balance", s.bo.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }), refuses(Blueprint.NotAllowed), noEvents()),

      // Receive from a supplier: a refund, from Creditors, submitted and then cancelled.
      s.step(
        "Mara Office Rentals refunds 50 USDC on 20 March, from Creditors to Bank",
        payment({ paymentType: "Receive", postingDate: "2026-03-20", partyType: "Supplier", party: s.world.supplier, paidFrom: s.world.creditors, paidTo: s.world.bank, paidAmount: 50n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("Ada submits it", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "Creditors' ledger, read by the refund, holds the party's credit",
        s.ada.run(ledger, { account: s.world.creditors, voucherId: s.last.paymentEntry }),
        expect((p) => p.items.map(bare)).toEqual([plain(s.world.creditors, "2026-03-20", 0n, 50n * USDC, "Supplier", s.world.supplier, false)]),
      ),
      s.step(
        "Mara Office Rentals' balance is 150 USDC",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([200n * USDC, 50n * USDC, 150n * USDC]),
      ),
      s.step(
        "but 200 USDC the day before the refund",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-03-19" }),
        expect(sums).toEqual([200n * USDC, 0n, 200n * USDC]),
      ),
      s.step(
        "Mara Office Rentals refunds 20 USDC on 25 March",
        payment({ paymentType: "Receive", postingDate: "2026-03-25", partyType: "Supplier", party: s.world.supplier, paidFrom: s.world.creditors, paidTo: s.world.bank, paidAmount: 20n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("Ada submits it", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "and cancels it",
        s.ada.run(cancel, { paymentEntry: s.last.paymentEntry }),
        expect((a) => a.reversed).toBe(2n),
        emits(PaymentEntryCancelled, { paymentEntry: s.last.paymentEntry, reversed: 2n }),
        payments.isIn(s.last.paymentEntry, "cancelled"),
      ),
      s.step(
        "Creditors' ledger, read by it, keeps its credit and adds the reversal, a debit with the same party, both cancelled",
        s.ada.run(ledger, { account: s.world.creditors, voucherId: s.last.paymentEntry }),
        expect((p) => p.items.map(bare)).toEqual([
          plain(s.world.creditors, "2026-03-25", 0n, 20n * USDC, "Supplier", s.world.supplier, true),
          plain(s.world.creditors, "2026-03-25", 20n * USDC, 0n, "Supplier", s.world.supplier, true),
        ]),
      ),
      s.step(
        "the advance and the first refund are untouched: Creditors holds four lines, two of them cancelled",
        s.ada.run(ledger, { account: s.world.creditors }),
        expect((p) => p.items.map((i: Gl) => i.isCancelled)).toEqual([false, false, true, true]),
      ),
      s.step(
        "and Mara Office Rentals' balance is still 150 USDC",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([200n * USDC, 50n * USDC, 150n * USDC]),
      ),

      // Pay to a customer: a refund, to Debtors.
      s.step(
        "Ada pays Kibo Stores 100 USDC on 1 April, from Bank to Debtors",
        payment({ paymentType: "Pay", postingDate: "2026-04-01", partyType: "Customer", party: s.world.customer, paidFrom: s.world.bank, paidTo: s.world.debtors, paidAmount: 100n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("and submits it", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "Debtors' ledger, read by it, holds the party's debit",
        s.ada.run(ledger, { account: s.world.debtors, voucherId: s.last.paymentEntry }),
        expect((p) => p.items.map(bare)).toEqual([plain(s.world.debtors, "2026-04-01", 100n * USDC, 0n, "Customer", s.world.customer, false)]),
      ),
      s.step("Debtors now holds three lines", s.ada.run(ledger, { account: s.world.debtors }), expect((p) => p.items.length).toBe(3)),
      s.step(
        "Kibo Stores' balance is 100 USDC owed, positive",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        expect(sums).toEqual([100n * USDC, 0n, 100n * USDC]),
      ),
      s.step("and nothing on 31 March", s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-03-31" }), expect(sums).toEqual([0n, 0n, 0n])),

      // A party's balance is its own: another customer of the same name doesn't count.
      s.step(
        "Ada adds a second customer of the same name",
        s.ada.run(createCustomer, { company: s.world.company, customerName: "Kibo Stores", customerType: "Company" }),
        expect((a) => a.customer).toMatch(/^cus_[0-9a-z]+$/),
      ),
      s.step(
        "and receives 70 USDC from it on 2 April",
        payment({ paymentType: "Receive", postingDate: "2026-04-02", partyType: "Customer", party: s.last.customer, paidFrom: s.world.debtors, paidTo: s.world.bank, paidAmount: 70n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("submitted", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "the first Kibo Stores' balance doesn't move",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        expect(sums).toEqual([100n * USDC, 0n, 100n * USDC]),
      ),
      s.step(
        "while Debtors holds both",
        s.ada.run(balance, { account: s.world.debtors, onDay: "2026-12-31" }),
        expect(sums).toEqual([100n * USDC, 70n * USDC, 30n * USDC]),
      ),

      // The fiscal year.
      s.step("Ada drafts a payment from Kibo Stores on 31 December 2025", fromKibo("2025-12-31", 10n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "it can't be submitted: the day is in none of Acme Trading's fiscal years",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2025-12-31" }),
        noEvents(),
        payments.isIn(s.last.paymentEntry, "draft"),
        spans({ absent: ["payment-entry.submit.post"] }),
      ),
      s.step("nor on 1 January 2027", fromKibo("2027-01-01", 10n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "refused the same way",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2027-01-01" }),
        noEvents(),
      ),
      s.step(
        "Acme Logistics sets up 2027",
        s.ada.run(createYear, { company: s.world.otherCompany, year: "2027", yearStartDate: "2027-01-01", yearEndDate: "2027-12-31", isShortYear: false }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step("Ada drafts Acme Trading's payment on 1 March 2027", fromKibo("2027-03-01", 10n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "another company's year doesn't count",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2027-03-01" }),
        noEvents(),
      ),
      s.step("the year's first day posts", fromKibo("2026-01-01", 1n), payments.isIn(s.last.paymentEntry, "draft")),
      s.step("submitted", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n), payments.isIn(s.last.paymentEntry, "submitted")),
      s.step("and its last", fromKibo("2026-12-31", 1n), payments.isIn(s.last.paymentEntry, "draft")),
      s.step("submitted", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n), payments.isIn(s.last.paymentEntry, "submitted")),
      s.step(
        "Kibo Stores' balance counts both base units, and none of the refused",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2027-12-31" }),
        expect(sums).toEqual([100n * USDC, 2n, 100n * USDC - 2n]),
      ),
      // A fiscal year that isn't a calendar year: FY28 runs from 1 April 2028 to 28 February 2029.
      s.step(
        "Acme Trading sets up FY28, from 1 April 2028 to 28 February 2029",
        s.ada.run(createYear, { company: s.world.company, year: "FY28", yearStartDate: "2028-04-01", yearEndDate: "2029-02-28", isShortYear: true }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step("a payment on 15 January 2029, inside it", fromKibo("2029-01-15", 3n), payments.isIn(s.last.paymentEntry, "draft")),
      s.step("posts, though its calendar year is 2029", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n), payments.isIn(s.last.paymentEntry, "submitted")),
      s.step("a payment on 15 March 2028, before it begins", fromKibo("2028-03-15", 3n), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "is refused, though its calendar year is 2028",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2028-03-15" }),
        noEvents(),
      ),
      s.step("and one on 15 March 2029, after it ends", fromKibo("2029-03-15", 3n), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "is refused too",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2029-03-15" }),
        noEvents(),
      ),
      s.step(
        "Kibo Stores' balance in 2029 counts the one that posted",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2029-12-31" }),
        expect(sums).toEqual([100n * USDC, 5n, 100n * USDC - 5n]),
      ),

      // A disabled party.
      s.step("Ada disables Mara Office Rentals", s.ada.run(disableSupplier, { supplier: s.world.supplier }), expect((a) => a.supplier).toBe(s.world.supplier)),
      s.step(
        "a disabled supplier's balance still reads from the ledger",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([200n * USDC, 50n * USDC, 150n * USDC]),
      ),
      s.step(
        "Creditors' first line is the advance paid to it, still submitted",
        s.ada.run(ledger, { account: s.world.creditors }),
        expect((p) => [p.items[0].party, p.items[0].debit, p.items[0].isCancelled]).toEqual([s.world.supplier, 200n * USDC, false]),
      ),
      s.step(
        "that payment can't be cancelled while its supplier is disabled",
        s.ada.run(cancel, { paymentEntry: s.last.items[0].voucherId }),
        refuses(PartyDisabled),
        noEvents(),
        spans({ absent: ["payment-entry.cancel.reverse"] }),
      ),
      s.step(
        "nothing was reversed: Creditors' advance is still not cancelled",
        s.ada.run(ledger, { account: s.world.creditors }),
        expect((p) => [p.items.length, p.items[0].isCancelled]).toEqual([4, false]),
      ),
      s.step("a payment to it in 2027 may be drafted", toMara("2027-01-04", 30n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "but not submitted: the fiscal year is judged before the party",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PaymentPostingDateOutsideFiscalYear, { postingDate: "2027-01-04" }),
        noEvents(),
      ),
      s.step("one in May 2026 may be drafted", toMara("2026-05-04", 30n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step(
        "but not submitted: Mara Office Rentals is disabled",
        s.ada.run(submit, { paymentEntry: s.last.paymentEntry }),
        refuses(PartyDisabled),
        noEvents(),
        payments.isIn(s.last.paymentEntry, "draft"),
        spans({ absent: ["payment-entry.submit.post"] }),
      ),
      s.step("nothing was posted to Creditors", s.ada.run(ledger, { account: s.world.creditors }), expect((p) => p.items.length).toBe(4)),
      s.step("Ada enables it again", s.ada.run(enableSupplier, { supplier: s.world.supplier }), expect((a) => a.supplier).toBe(s.world.supplier)),
      s.step("and drafts the May payment again", toMara("2026-05-04", 30n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step("now it submits", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n), payments.isIn(s.last.paymentEntry, "submitted")),
      s.step(
        "and Mara Office Rentals' balance takes it",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([230n * USDC, 50n * USDC, 180n * USDC]),
      ),
      // A supplier's balance is its own: another supplier of the same name doesn't count.
      s.step(
        "Ada adds a second supplier of the same name",
        s.ada.run(createSupplier, { company: s.world.company, supplierName: "Mara Office Rentals", supplierType: "Company" }),
        expect((a) => a.supplier).toMatch(/^sup_[0-9a-z]+$/),
      ),
      s.step(
        "and pays it 40 USDC on 6 March, to Creditors",
        payment({ paymentType: "Pay", postingDate: "2026-03-06", partyType: "Supplier", party: s.last.supplier, paidFrom: s.world.bank, paidTo: s.world.creditors, paidAmount: 40n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("submitted", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "the first supplier's balance doesn't move",
        s.ada.run(supplierBalance, { supplier: s.world.supplier, onDay: "2026-12-31" }),
        expect(sums).toEqual([230n * USDC, 50n * USDC, 180n * USDC]),
      ),
      s.step(
        "while Creditors holds both",
        s.ada.run(balance, { account: s.world.creditors, onDay: "2026-12-31" }),
        expect(sums).toEqual([270n * USDC, 50n * USDC, 220n * USDC]),
      ),
      s.step("Ada disables Kibo Stores", s.ada.run(disableCustomer, { customer: s.world.customer }), expect((a) => a.customer).toBe(s.world.customer)),
      s.step(
        "a disabled customer's balance still reads from the ledger",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2027-12-31" }),
        expect(sums).toEqual([100n * USDC, 2n, 100n * USDC - 2n]),
      ),
      s.step("a payment from it may be drafted", fromKibo("2026-06-01", 5n * USDC), payments.isIn(s.last.paymentEntry, "draft")),
      s.step("but not submitted: money in from a disabled customer is refused too", s.ada.run(submit, { paymentEntry: s.last.paymentEntry }), refuses(PartyDisabled), noEvents()),
      s.step("no line was ever posted to a group: Assets' ledger is empty", s.ada.run(ledger, { account: s.world.assets }), expect((p) => p.items.length).toBe(0)),
      s.step("and Liabilities'", s.ada.run(ledger, { account: s.world.liabilities }), expect((p) => p.items.length).toBe(0)),
    ];
  },
});
