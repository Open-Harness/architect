// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Amounts are USDC in base units (CX-grill, section 3): 45000000n is 45 USDC.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ExpenseClaimApproved, ExpenseClaimCreated } from "../blueprint/things/expense-claim/events.ts";
import { machine as claims } from "../blueprint/things/expense-claim/machine.ts";
import { ExpenseAdded } from "../blueprint/things/expense/events.ts";
import { ClaimNotDraft, SanctionedOverClaimed } from "../blueprint/things/expense/errors.ts";
import create from "../blueprint/things/expense-claim/verbs/create.ts";
import approve from "../blueprint/things/expense-claim/verbs/approve.ts";
import getClaim from "../blueprint/things/expense-claim/verbs/get.ts";
import add from "../blueprint/things/expense/verbs/add.ts";
import getExpense from "../blueprint/things/expense/verbs/get.ts";

export default Blueprint.journey("claim expenses", {
  // Olga works at Acme Trading and has started a claim; Ada runs it; Bo is signed in and has nothing to do with either.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an expense claim with two types",
  steps: (s) => [
    s.step(
      "Olga can start another claim of her own",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-11-21" }),
      expect((a) => a.expenseClaim).toMatch(/^ecl_[0-9a-z]+$/),
      emits(ExpenseClaimCreated, { expenseClaim: s.last.expenseClaim, company: s.world.company, employee: s.world.employee }),
      claims.isIn(s.last.expenseClaim, "draft"),
      spans({ present: ["expense-claim.create", "expense-claim.create.insert"] }),
    ),
    s.step(
      "the new claim reads back as Olga's, posted on 21 November",
      s.olga.run(getClaim, { id: s.last.expenseClaim }),
      expect((a) => [a.company, a.employee, a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-21",
        0n,
        0n,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "her first claim reads back with nothing claimed yet",
      s.olga.run(getClaim, { id: s.world.expenseClaim }),
      expect((a) => [a.company, a.employee, a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-20",
        0n,
        0n,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "Bo can't start a claim for Olga",
      s.bo.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-11-20" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["expense-claim.create", "expense-claim.create.insert"] }),
    ),
    s.step(
      "Bo can't read Olga's claim",
      s.bo.run(getClaim, { id: s.world.expenseClaim }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't sanction more than was spent",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-18",
        expenseType: s.world.expenseClaimType,
        amount: 45000000n,
        sanctionedAmount: 45000001n,
      }),
      refuses(SanctionedOverClaimed, { amount: 45000000n }),
      noEvents(),
      spans({ absent: ["expense-claim.create.insert"] }),
    ),
    s.step(
      "Ada adds a 45 USDC taxi, sanctioned in full",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-18",
        expenseType: s.world.expenseClaimType,
        amount: 45000000n,
        sanctionedAmount: 45000000n,
      }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount]).toEqual([45000000n, 45000000n]),
      expect((a) => a.expense).toMatch(/^exp_[0-9a-z]+$/),
      emits(ExpenseAdded, { expense: s.last.expense, expenseClaim: s.world.expenseClaim, amount: 45000000n, totalClaimedAmount: 45000000n }),
      spans({ present: ["expense.add", "expense.add.load", "expense.add.insert"] }),
    ),
    s.step(
      "the taxi reads back as Ada typed it",
      s.ada.run(getExpense, { id: s.last.expense }),
      expect((a) => [a.expenseClaim, a.expenseDate, a.expenseType, a.amount, a.sanctionedAmount, a.state]).toEqual([
        s.world.expenseClaim,
        "2026-11-18",
        s.world.expenseClaimType,
        45000000n,
        45000000n,
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada adds a 120.50 USDC hotel as Lodging, sanctioning 100 USDC of it",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.lodging,
        amount: 120500000n,
        sanctionedAmount: 100000000n,
      }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount]).toEqual([165500000n, 145000000n]),
      emits(ExpenseAdded, { amount: 120500000n, totalClaimedAmount: 165500000n }),
    ),
    s.step(
      "the hotel reads back with what was spent and what was sanctioned",
      s.ada.run(getExpense, { id: s.last.expense }),
      expect((a) => [a.expenseClaim, a.expenseDate, a.expenseType, a.amount, a.sanctionedAmount]).toEqual([
        s.world.expenseClaim,
        "2026-11-19",
        s.world.lodging,
        120500000n,
        100000000n,
      ]),
      noEvents(),
    ),
    s.step(
      "a line is judged on its own amounts, not the claim's: 12 USDC can't be sanctioned on a 10.50 USDC lunch",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.expenseClaimType,
        amount: 10500000n,
        sanctionedAmount: 12000000n,
      }),
      // The refusal carries the line's amount to the base unit, not rounded to whole USDC.
      refuses(SanctionedOverClaimed, { amount: 10500000n }),
      noEvents(),
    ),
    s.step(
      "the claim reads back with both totals",
      s.olga.run(getClaim, { id: s.world.expenseClaim }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([165500000n, 145000000n, "draft"]),
      noEvents(),
    ),
    s.step(
      "Olga can't approve her own claim",
      s.olga.run(approve, { expenseClaim: s.world.expenseClaim }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      claims.isIn(s.world.expenseClaim, "draft"),
    ),
    s.step(
      "Ada approves it, owing Olga 145 USDC",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      expect((a) => [a.expenseClaim, a.totalSanctionedAmount]).toEqual([s.world.expenseClaim, 145000000n]),
      emits(ExpenseClaimApproved, { expenseClaim: s.world.expenseClaim, totalSanctionedAmount: 145000000n }),
      claims.isIn(s.world.expenseClaim, "approved"),
    ),
    s.step(
      "an approved claim takes no more expenses",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.expenseClaimType,
        amount: 1000000n,
        sanctionedAmount: 2000000n,
      }),
      // A claim that isn't a draft is refused before its line is judged: ClaimNotDraft, not SanctionedOverClaimed.
      refuses(ClaimNotDraft),
      noEvents(),
    ),
    s.step(
      "nor is it approved twice",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      refuses(claims.notFrom, { state: "approved" }),
      noEvents(),
    ),
    s.step(
      "it still reads back with what was approved",
      s.olga.run(getClaim, { id: s.world.expenseClaim }),
      expect((a) => [a.company, a.employee, a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-20",
        165500000n,
        145000000n,
        "approved",
      ]),
      noEvents(),
    ),
  ],
});
