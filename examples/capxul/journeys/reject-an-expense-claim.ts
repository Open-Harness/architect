// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ExpenseClaimRejected } from "../blueprint/things/expense-claim/events.ts";
import { ClaimHasNoExpenses } from "../blueprint/things/expense-claim/errors.ts";
import { ClaimNotDraft } from "../blueprint/things/expense/errors.ts";
import { machine } from "../blueprint/things/expense-claim/machine.ts";
import approve from "../blueprint/things/expense-claim/verbs/approve.ts";
import reject from "../blueprint/things/expense-claim/verbs/reject.ts";
import get from "../blueprint/things/expense-claim/verbs/get.ts";
import add from "../blueprint/things/expense/verbs/add.ts";
import create from "../blueprint/things/expense-claim/verbs/create.ts";
import getExpense from "../blueprint/things/expense/verbs/get.ts";

export default Blueprint.journey("reject an expense claim", {
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "an expense claim",
  steps: (s) => [
    s.step(
      "a claim with no expenses can't be approved",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      refuses(ClaimHasNoExpenses),
      noEvents(),
      machine.isIn(s.world.expenseClaim, "draft"),
    ),
    s.step(
      "Ada adds 30 USDC of lunches",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.expenseClaimType,
        amount: 30000000n,
        sanctionedAmount: 30000000n,
      }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount]).toEqual([30000000n, 30000000n]),
    ),
    s.step(
      "the lunches read back on Olga's claim",
      s.ada.run(getExpense, { id: s.last.expense }),
      expect((a) => [a.expenseClaim, a.expenseDate, a.expenseType, a.amount, a.sanctionedAmount, a.state]).toEqual([
        s.world.expenseClaim,
        "2026-11-19",
        s.world.expenseClaimType,
        30000000n,
        30000000n,
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga can't reject her own claim",
      s.olga.run(reject, { expenseClaim: s.world.expenseClaim }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada rejects it",
      s.ada.run(reject, { expenseClaim: s.world.expenseClaim }),
      expect((a) => a.expenseClaim).toBe(s.world.expenseClaim),
      emits(ExpenseClaimRejected, { expenseClaim: s.world.expenseClaim }),
      machine.isIn(s.world.expenseClaim, "rejected"),
    ),
    s.step(
      "a rejected claim takes no more expenses, not even an over-sanctioned one",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.expenseClaimType,
        amount: 1000000n,
        sanctionedAmount: 2000000n,
      }),
      // Order: ClaimNotDraft before SanctionedOverClaimed, on a rejected claim as on an approved one.
      refuses(ClaimNotDraft),
      noEvents(),
    ),
    s.step(
      "a rejected claim sanctions nothing, and keeps what was claimed",
      s.olga.run(get, { id: s.world.expenseClaim }),
      expect((a) => [a.company, a.employee, a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-20",
        30000000n,
        0n,
        "rejected",
      ]),
      noEvents(),
    ),
    s.step(
      "nor can it then be approved",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      refuses(machine.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "Olga starts a second claim, on 2 December",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-12-02" }),
      expect((a) => a.expenseClaim).toMatch(/^ecl_[0-9a-z]+$/),
    ),
    s.step(
      "Ada rejects that one too, with nothing on it",
      s.ada.run(reject, { expenseClaim: s.last.expenseClaim }),
      expect((a) => a.expenseClaim).toBe(s.last.expenseClaim),
      emits(ExpenseClaimRejected, { expenseClaim: s.last.expenseClaim }),
      machine.isIn(s.last.expenseClaim, "rejected"),
    ),
    s.step(
      "the second claim reads back rejected, on its own day",
      s.olga.run(get, { id: s.last.expenseClaim }),
      expect((a) => [a.company, a.employee, a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-12-02",
        0n,
        0n,
        "rejected",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga starts a third claim, on 3 December",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-12-03" }),
      expect((a) => a.expenseClaim).toMatch(/^ecl_[0-9a-z]+$/),
    ),
    s.step(
      "Ada adds 4 USDC of lunches to it, sanctioning 3",
      s.ada.run(add, {
        expenseClaim: s.last.expenseClaim,
        expenseDate: "2026-12-03",
        expenseType: s.world.expenseClaimType,
        amount: 4000000n,
        sanctionedAmount: 3000000n,
      }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount]).toEqual([4000000n, 3000000n]),
    ),
    s.step(
      "the 4 USDC line reads back on the third claim",
      s.ada.run(getExpense, { id: s.last.expense }),
      expect((a) => [a.expenseDate, a.amount, a.sanctionedAmount]).toEqual(["2026-12-03", 4000000n, 3000000n]),
      noEvents(),
    ),
    s.step(
      "Ada rejects the third claim",
      s.ada.run(reject, { expenseClaim: s.last.expenseClaim }),
      expect((a) => a.expenseClaim).toBe(s.last.expenseClaim),
      emits(ExpenseClaimRejected, { expenseClaim: s.last.expenseClaim }),
      machine.isIn(s.last.expenseClaim, "rejected"),
    ),
    s.step(
      "the third claim, partly sanctioned, reads back rejected: it keeps its 4 USDC claimed and sanctions nothing",
      s.olga.run(get, { id: s.last.expenseClaim }),
      expect((a) => [a.postingDate, a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual(["2026-12-03", 4000000n, 0n, "rejected"]),
      noEvents(),
    ),
  ],
});
