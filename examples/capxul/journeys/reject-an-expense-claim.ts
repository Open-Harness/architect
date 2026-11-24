// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ExpenseClaimRejected } from "../blueprint/things/expense-claim/events.ts";
import { ClaimHasNoExpenses } from "../blueprint/things/expense-claim/errors.ts";
import { machine } from "../blueprint/things/expense-claim/machine.ts";
import approve from "../blueprint/things/expense-claim/verbs/approve.ts";
import reject from "../blueprint/things/expense-claim/verbs/reject.ts";
import get from "../blueprint/things/expense-claim/verbs/get.ts";
import add from "../blueprint/things/expense/verbs/add.ts";

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
      "a rejected claim sanctions nothing, and keeps what was claimed",
      s.olga.run(get, { id: s.world.expenseClaim }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount, a.state]).toEqual([30000000n, 0n, "rejected"]),
      noEvents(),
    ),
    s.step(
      "nor can it then be approved",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      refuses(machine.notFrom, { state: "rejected" }),
      noEvents(),
    ),
  ],
});
