// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Payment Entry `validate`, for Receive and Pay with no invoice (decisions/CX-parties-payments.md). Refusal
// order on create (payment-entry/errors.ts): Paid From's PaymentAccountNotInCompany then PaymentAccountIsGroup, then
// Paid To's; PaymentCostCenterNotInCompany, PaymentCostCenterIsGroup; PartyAccountWrongType; PartyNotFound;
// PartyNotInCompany; PaidAmountZero. The party's account is Paid From on Receive and Paid To on Pay, and must be
// Receivable for a Customer and Payable for a Supplier, whichever way the money goes. A draft posts nothing.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PaymentEntryDrafted } from "../blueprint/things/payment-entry/events.ts";
import {
  PaidAmountZero,
  PartyAccountWrongType,
  PartyNotFound,
  PartyNotInCompany,
  PaymentAccountIsGroup,
  PaymentAccountNotInCompany,
  PaymentCostCenterIsGroup,
  PaymentCostCenterNotInCompany,
} from "../blueprint/things/payment-entry/errors.ts";
import { machine as payments } from "../blueprint/things/payment-entry/machine.ts";
import draft from "../blueprint/things/payment-entry/verbs/create.ts";
import get from "../blueprint/things/payment-entry/verbs/get.ts";
import disableCustomer from "../blueprint/things/customer/verbs/disable.ts";
import createCostCenter from "../blueprint/things/cost-center/verbs/create.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import customerBalance from "../blueprint/things/customer/verbs/balance.ts";

const USDC = 1_000_000n;

export default Blueprint.journey("draft a payment entry", {
  // Acme Trading's chart: Assets > Bank (Bank) and Debtors (Receivable); Liabilities > Creditors (Payable); Expenses >
  // Operating Expenses > Rent (no type); cost centers Acme Trading > Operations; the fiscal year 2026. Its customer Kibo
  // Stores and supplier Mara Office Rentals. Acme Logistics' Assets > Debtors, its cost centers Acme Logistics > Haulage,
  // its customer Kampala Traders and supplier Nile Fuel. Ada runs both companies; Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "an outside supplier",
  steps: (s) => {
    // Money in from Kibo Stores: Debtors to Bank, 500 USDC on 10 February 2026, in Operations.
    const receive = {
      company: s.world.company, paymentType: "Receive", postingDate: "2026-02-10", partyType: "Customer", party: s.world.customer,
      paidFrom: s.world.debtors, paidTo: s.world.bank, paidAmount: 500n * USDC, costCenter: s.world.costCenter,
    };
    // Money out to Mara Office Rentals: Bank to Creditors, 200 USDC on 5 March 2026, in Operations.
    const pay = {
      company: s.world.company, paymentType: "Pay", postingDate: "2026-03-05", partyType: "Supplier", party: s.world.supplier,
      paidFrom: s.world.bank, paidTo: s.world.creditors, paidAmount: 200n * USDC, costCenter: s.world.costCenter,
    };
    const tryIt = (base: Record<string, unknown>, change: Record<string, unknown>) => s.ada.run(draft, { ...base, ...change } as never);
    const read = (a: Record<string, unknown>) =>
      [a["company"], a["paymentType"], a["postingDate"], a["partyType"], a["party"], a["paidFrom"], a["paidTo"], a["paidAmount"], a["costCenter"], a["state"]];
    return [
      s.step(
        "Bo can't draft a payment for Acme Trading",
        s.bo.run(draft, receive as never),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["payment-entry.create", "payment-entry.create.insert"] }),
      ),

      // The accounts, Paid From before Paid To, each its company before its being a group.
      s.step(
        "Paid From in another company is refused, carrying its side",
        tryIt(receive, { paidFrom: s.world.otherDebtors }),
        refuses(PaymentAccountNotInCompany, { side: "Paid From" }),
        noEvents(),
        spans({ absent: ["payment-entry.create.insert"] }),
      ),
      s.step(
        "a group account there is refused",
        tryIt(receive, { paidFrom: s.world.assets }),
        refuses(PaymentAccountIsGroup, { side: "Paid From" }),
        noEvents(),
      ),
      s.step(
        "another company's group there is refused for its company first",
        tryIt(receive, { paidFrom: s.world.otherAssets }),
        refuses(PaymentAccountNotInCompany, { side: "Paid From" }),
        noEvents(),
      ),
      s.step(
        "Paid To in another company is refused, carrying its side",
        tryIt(receive, { paidTo: s.world.otherDebtors }),
        refuses(PaymentAccountNotInCompany, { side: "Paid To" }),
        noEvents(),
      ),
      s.step(
        "a group account there is refused",
        tryIt(receive, { paidTo: s.world.liabilities }),
        refuses(PaymentAccountIsGroup, { side: "Paid To" }),
        noEvents(),
      ),
      s.step(
        "Paid From is judged before Paid To: a group there and another company's account here",
        tryIt(receive, { paidFrom: s.world.assets, paidTo: s.world.otherDebtors }),
        refuses(PaymentAccountIsGroup, { side: "Paid From" }),
        noEvents(),
      ),
      s.step(
        "and another company's account there before a group here",
        tryIt(pay, { paidFrom: s.world.otherDebtors, paidTo: s.world.liabilities }),
        refuses(PaymentAccountNotInCompany, { side: "Paid From" }),
        noEvents(),
      ),
      s.step(
        "on Pay the bank is Paid From, and judged there",
        tryIt(pay, { paidFrom: s.world.assets }),
        refuses(PaymentAccountIsGroup, { side: "Paid From" }),
        noEvents(),
      ),
      s.step(
        "and the party's account is Paid To",
        tryIt(pay, { paidTo: s.world.otherDebtors }),
        refuses(PaymentAccountNotInCompany, { side: "Paid To" }),
        noEvents(),
      ),

      // The cost center, its company before its being a group, after both accounts.
      s.step("a cost center in another company is refused", tryIt(receive, { costCenter: s.world.haulage }), refuses(PaymentCostCenterNotInCompany), noEvents()),
      s.step("a group cost center is refused", tryIt(receive, { costCenter: s.world.mainCostCenter }), refuses(PaymentCostCenterIsGroup), noEvents()),
      s.step(
        "a group account below the root is refused too",
        tryIt(receive, { paidTo: s.world.operating }),
        refuses(PaymentAccountIsGroup, { side: "Paid To" }),
        noEvents(),
      ),
      s.step(
        "Ada adds a group cost center under the root",
        s.ada.run(createCostCenter, { company: s.world.company, costCenterName: "Sales", parentCostCenter: s.world.mainCostCenter, isGroup: true }),
        expect((a) => a.costCenter).toMatch(/^cct_/),
      ),
      s.step("a group cost center below the root is refused", tryIt(receive, { costCenter: s.last.costCenter }), refuses(PaymentCostCenterIsGroup), noEvents()),
      s.step(
        "another company's group cost center is refused for its company first",
        tryIt(receive, { costCenter: s.world.otherCostCenterGroup }),
        refuses(PaymentCostCenterNotInCompany),
        noEvents(),
      ),
      s.step(
        "the accounts are judged before the cost center",
        tryIt(receive, { paidTo: s.world.liabilities, costCenter: s.world.haulage }),
        refuses(PaymentAccountIsGroup, { side: "Paid To" }),
        noEvents(),
      ),

      // The party's account type.
      s.step(
        "a customer's money in can't come from a Payable account",
        tryIt(receive, { paidFrom: s.world.creditors }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),
      s.step("nor from a Bank account", tryIt(receive, { paidFrom: s.world.bank }), refuses(PartyAccountWrongType), noEvents()),
      s.step("nor from an account with no type", tryIt(receive, { paidFrom: s.world.rent }), refuses(PartyAccountWrongType), noEvents()),
      s.step(
        "a supplier's money out can't go to a Receivable account",
        tryIt(pay, { paidTo: s.world.debtors }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),
      s.step(
        "money in from a supplier comes from Payable, not Receivable",
        tryIt(pay, { paymentType: "Receive", paidFrom: s.world.debtors, paidTo: s.world.bank }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),
      s.step(
        "money out to a customer goes to Receivable, not Payable",
        tryIt(receive, { paymentType: "Pay", paidFrom: s.world.bank, paidTo: s.world.creditors }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),
      s.step(
        "the cost center is judged before the party's account",
        tryIt(receive, { paidFrom: s.world.creditors, costCenter: s.world.mainCostCenter }),
        refuses(PaymentCostCenterIsGroup),
        noEvents(),
      ),

      // The party.
      s.step(
        "a supplier named as a customer isn't found",
        tryIt(receive, { party: s.world.supplier }),
        refuses(PartyNotFound),
        noEvents(),
      ),
      s.step(
        "nor a customer named as a supplier",
        tryIt(pay, { party: s.world.customer }),
        refuses(PartyNotFound),
        noEvents(),
      ),
      s.step("nor a party nobody added", tryIt(receive, { party: "cus_0000000000000000000000000" }), refuses(PartyNotFound), noEvents()),
      s.step(
        "the party's account is judged before the party",
        tryIt(receive, { paidFrom: s.world.creditors, party: s.world.supplier }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),
      s.step(
        "Acme Logistics' customer can't pay Acme Trading",
        tryIt(receive, { party: s.world.otherCustomer }),
        refuses(PartyNotInCompany),
        noEvents(),
      ),
      s.step(
        "nor can Acme Trading pay Acme Logistics' supplier",
        tryIt(pay, { party: s.world.otherSupplier }),
        refuses(PartyNotInCompany),
        noEvents(),
      ),
      s.step(
        "a party of another company is judged after the party's account",
        tryIt(pay, { party: s.world.otherSupplier, paidTo: s.world.debtors }),
        refuses(PartyAccountWrongType),
        noEvents(),
      ),

      // The amount, last.
      s.step("an amount of nothing is refused", tryIt(receive, { paidAmount: 0n }), refuses(PaidAmountZero), noEvents()),
      s.step("on Pay too", tryIt(pay, { paidAmount: 0n }), refuses(PaidAmountZero), noEvents()),
      s.step("after the party", tryIt(receive, { paidAmount: 0n, party: s.world.otherCustomer }), refuses(PartyNotInCompany), noEvents()),
      s.step("and after a party not found", tryIt(pay, { paidAmount: 0n, party: s.world.customer }), refuses(PartyNotFound), noEvents()),

      // What is drafted.
      s.step(
        "Ada drafts 500 USDC received from Kibo Stores",
        s.ada.run(draft, receive as never),
        expect((a) => a.paymentEntry).toMatch(/^pen_[0-9a-z]+$/),
        emits(PaymentEntryDrafted, {
          paymentEntry: s.last.paymentEntry, company: s.world.company, paymentType: "Receive", partyType: "Customer", party: s.world.customer, paidAmount: 500n * USDC,
        }),
        payments.isIn(s.last.paymentEntry, "draft"),
        spans({ present: ["payment-entry.create", "payment-entry.create.load", "payment-entry.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(get, { id: s.last.paymentEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "it reads back a draft, as she typed it",
        s.ada.run(get, { id: s.last.paymentEntry }),
        expect(read).toEqual([
          s.world.company, "Receive", "2026-02-10", "Customer", s.world.customer, s.world.debtors, s.world.bank, 500n * USDC, s.world.costCenter, "draft",
        ]),
        noEvents(),
      ),
      s.step("a draft posts nothing: Debtors' ledger is empty", s.ada.run(ledger, { account: s.world.debtors }), expect((p) => p.items.length).toBe(0)),
      s.step("and so is Bank's", s.ada.run(ledger, { account: s.world.bank }), expect((p) => p.items.length).toBe(0)),
      s.step(
        "and Kibo Stores' balance is nothing",
        s.ada.run(customerBalance, { customer: s.world.customer, onDay: "2026-12-31" }),
        expect((a) => [a.debit, a.credit, a.balance]).toEqual([0n, 0n, 0n]),
      ),
      s.step(
        "Ada drafts 200 USDC paid to Mara Office Rentals",
        s.ada.run(draft, pay as never),
        emits(PaymentEntryDrafted, {
          paymentEntry: s.last.paymentEntry, company: s.world.company, paymentType: "Pay", partyType: "Supplier", party: s.world.supplier, paidAmount: 200n * USDC,
        }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step(
        "it reads back with the bank as Paid From and Creditors as Paid To",
        s.ada.run(get, { id: s.last.paymentEntry }),
        expect(read).toEqual([
          s.world.company, "Pay", "2026-03-05", "Supplier", s.world.supplier, s.world.bank, s.world.creditors, 200n * USDC, s.world.costCenter, "draft",
        ]),
      ),
      s.step(
        "money in from a supplier, from Creditors, may be drafted: a refund",
        tryIt(pay, { paymentType: "Receive", paidFrom: s.world.creditors, paidTo: s.world.bank, paidAmount: 50n * USDC }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step(
        "it reads back as Receive from the supplier",
        s.ada.run(get, { id: s.last.paymentEntry }),
        expect(read).toEqual([
          s.world.company, "Receive", "2026-03-05", "Supplier", s.world.supplier, s.world.creditors, s.world.bank, 50n * USDC, s.world.costCenter, "draft",
        ]),
      ),
      s.step(
        "and money out to a customer, to Debtors",
        tryIt(receive, { paymentType: "Pay", paidFrom: s.world.bank, paidTo: s.world.debtors, paidAmount: 1n }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step(
        "it reads back as Pay to the customer, one base unit",
        s.ada.run(get, { id: s.last.paymentEntry }),
        expect(read).toEqual([
          s.world.company, "Pay", "2026-02-10", "Customer", s.world.customer, s.world.bank, s.world.debtors, 1n, s.world.costCenter, "draft",
        ]),
      ),
      s.step(
        "the side the money reaches isn't judged for its type: a ledger with none may take it",
        tryIt(receive, { paidTo: s.world.rent }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step(
        "a date outside every fiscal year may be drafted: it is judged on submit",
        tryIt(receive, { postingDate: "2025-06-30" }),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
      s.step("Ada disables Kibo Stores", s.ada.run(disableCustomer, { customer: s.world.customer }), expect((a) => a.customer).toBe(s.world.customer)),
      s.step(
        "a payment from a disabled customer may still be drafted: that too is judged on submit",
        s.ada.run(draft, receive as never),
        payments.isIn(s.last.paymentEntry, "draft"),
      ),
    ];
  },
});
