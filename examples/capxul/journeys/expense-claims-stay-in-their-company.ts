// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ExpenseClaimApproved } from "../blueprint/things/expense-claim/events.ts";
import { ClaimantNotActive, EmployeeNotInCompany } from "../blueprint/things/expense-claim/errors.ts";
import { machine } from "../blueprint/things/expense-claim/machine.ts";
import { ExpenseTypeNotInCompany } from "../blueprint/things/expense/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createType from "../blueprint/things/expense-claim-type/verbs/create.ts";
import create from "../blueprint/things/expense-claim/verbs/create.ts";
import approve from "../blueprint/things/expense-claim/verbs/approve.ts";
import add from "../blueprint/things/expense/verbs/add.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

export default Blueprint.journey("expense claims stay in their company", {
  // Olga has a claim in draft at Acme Trading; Ada runs it; Bo runs a company of his own.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an expense claim",
  steps: (s) => [
    s.step(
      "Ada relieves Olga on 30 November",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      expect((a) => a.relievingDate).toBe("2026-11-30"),
    ),
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't file a claim in his company for Olga, who worked for Ada and has left",
      s.bo.run(create, { company: s.last.company, employee: s.world.employee, postingDate: "2026-12-01" }),
      // The company is judged before the employee's state: EmployeeNotInCompany, not ClaimantNotActive.
      refuses(EmployeeNotInCompany),
      noEvents(),
      spans({ absent: ["expense-claim.create.insert"] }),
    ),
    s.step(
      "Bo adds an expense type to it",
      s.bo.run(createType, { company: s.last.company, expenseType: "Travel" }),
      expect((a) => a.expenseClaimType).toMatch(/^ect_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't put Bo's expense type on Olga's claim",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.last.expenseClaimType,
        amount: 5000000n,
        sanctionedAmount: 5000000n,
      }),
      refuses(ExpenseTypeNotInCompany),
      noEvents(),
      spans({ absent: ["expense.add.insert"] }),
    ),
    s.step(
      "a claim can't be started for an employee who has left",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-12-01" }),
      refuses(ClaimantNotActive),
      noEvents(),
      spans({ absent: ["expense-claim.create.insert"] }),
    ),
    s.step(
      "Ada adds 5 USDC Olga spent before leaving, sanctioning none of it",
      s.ada.run(add, {
        expenseClaim: s.world.expenseClaim,
        expenseDate: "2026-11-19",
        expenseType: s.world.expenseClaimType,
        amount: 5000000n,
        sanctionedAmount: 0n,
      }),
      expect((a) => [a.totalClaimedAmount, a.totalSanctionedAmount]).toEqual([5000000n, 0n]),
    ),
    s.step(
      "a claim with something claimed may be approved for nothing",
      s.ada.run(approve, { expenseClaim: s.world.expenseClaim }),
      expect((a) => [a.expenseClaim, a.totalSanctionedAmount]).toEqual([s.world.expenseClaim, 0n]),
      emits(ExpenseClaimApproved, { expenseClaim: s.world.expenseClaim, totalSanctionedAmount: 0n }),
      machine.isIn(s.world.expenseClaim, "approved"),
    ),
  ],
});
