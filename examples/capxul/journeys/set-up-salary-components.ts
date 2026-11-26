// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Salary Component (decisions/CX-payroll.md): a company's own earning or deduction, its default amount and the
// ledger its pay is booked to. `create` refuses ComponentAccountNotInCompany, then ComponentAccountIsGroup; a name
// already used in the company is the rule's SalaryComponentTaken, judged after them.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { SalaryComponentCreated } from "../blueprint/things/salary-component/events.ts";
import { ComponentAccountIsGroup, ComponentAccountNotInCompany, SalaryComponentTaken } from "../blueprint/things/salary-component/errors.ts";
import { machine as components } from "../blueprint/things/salary-component/machine.ts";
import createComponent from "../blueprint/things/salary-component/verbs/create.ts";
import getComponent from "../blueprint/things/salary-component/verbs/get.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";

const USDC = 1_000_000n;

export default Blueprint.journey("set up salary components", {
  // Acme Trading's chart, with Salaries under Operating Expenses and Payroll Payable and Pension Payable under
  // Liabilities. Ada also runs Acme Logistics, which has no chart yet. Bo runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a salaries ledger",
  steps: (s) => [
    s.step(
      "Bo can't add a component to Acme Trading",
      s.bo.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Earning", amount: 3_000n * USDC, account: s.world.salaries }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["salary-component.create.insert"] }),
    ),
    s.step(
      "Ada adds Basic, an earning of 3,000 USDC by default, booked to Salaries",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Earning", amount: 3_000n * USDC, account: s.world.salaries }),
      emits(SalaryComponentCreated, { company: s.world.company, type: "Earning" }),
      components.isIn(s.last.salaryComponent, "active"),
      spans({ present: ["salary-component.create", "salary-component.create.load", "salary-component.create.insert"] }),
    ),
    s.step("Bo can't read it", s.bo.run(getComponent, { id: s.last.salaryComponent }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "it reads back as added",
      s.ada.run(getComponent, { id: s.last.salaryComponent }),
      expect((a) => [a.company, a.salaryComponent, a.type, a.amount, a.account, a.state]).toEqual([
        s.world.company, "Basic", "Earning", 3_000n * USDC, s.world.salaries, "active",
      ]),
    ),
    s.step(
      "Pension, a deduction of 150 USDC, is booked to Pension Payable",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Pension", type: "Deduction", amount: 150n * USDC, account: s.world.pension }),
      emits(SalaryComponentCreated, { company: s.world.company, type: "Deduction" }),
    ),
    s.step(
      "and reads back a deduction",
      s.ada.run(getComponent, { id: s.last.salaryComponent }),
      expect((a) => [a.salaryComponent, a.type, a.amount, a.account]).toEqual(["Pension", "Deduction", 150n * USDC, s.world.pension]),
    ),
    s.step(
      "Housing may have no default amount",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Housing", type: "Earning", amount: 0n, account: s.world.salaries }),
    ),
    s.step("and reads back 0", s.ada.run(getComponent, { id: s.last.salaryComponent }), expect((a) => [a.salaryComponent, a.amount]).toEqual(["Housing", 0n])),
    s.step(
      "a component booked to a group is refused",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Bonus", type: "Earning", amount: 0n, account: s.world.operating }),
      refuses(ComponentAccountIsGroup),
      noEvents(),
      spans({ absent: ["salary-component.create.insert"] }),
    ),
    s.step(
      "so is one booked to Liabilities, the group above Payroll Payable",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Tax", type: "Deduction", amount: 10n * USDC, account: s.world.liabilities }),
      refuses(ComponentAccountIsGroup),
      noEvents(),
    ),
    s.step(
      "a name already used in the company is refused, whatever its type",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Deduction", amount: 5n * USDC, account: s.world.pension }),
      refuses(SalaryComponentTaken),
      noEvents(),
    ),
    s.step(
      "Ada starts Acme Logistics' chart with a root group",
      s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Expenses", isGroup: true, rootType: "Expense" }),
    ),
    s.step(
      "Acme Trading's component booked to that group is refused for the company, before the group",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Overtime", type: "Earning", amount: 0n, account: s.last.account }),
      refuses(ComponentAccountNotInCompany),
      noEvents(),
    ),
    s.step(
      "and a ledger under it",
      s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Wages", parentAccount: s.last.account, isGroup: false }),
    ),
    s.step(
      "Acme Trading's component can't be booked to Acme Logistics' ledger",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Overtime", type: "Earning", amount: 0n, account: s.last.account }),
      refuses(ComponentAccountNotInCompany),
      noEvents(),
      spans({ absent: ["salary-component.create.insert"] }),
    ),
    s.step(
      "another company's account is refused before a name already taken",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Earning", amount: 0n, account: s.last.account }),
      refuses(ComponentAccountNotInCompany),
      noEvents(),
    ),
    s.step(
      "and a group before a name already taken",
      s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Earning", amount: 0n, account: s.world.operating }),
      refuses(ComponentAccountIsGroup),
      noEvents(),
    ),
    s.step(
      "Acme Logistics may have its own Basic, booked to its own ledger",
      s.ada.run(createComponent, { company: s.world.otherCompany, salaryComponent: "Basic", type: "Earning", amount: 1_000n * USDC, account: s.last.account }),
      emits(SalaryComponentCreated, { company: s.world.otherCompany, type: "Earning" }),
    ),
    s.step(
      "but not booked to Acme Trading's Salaries",
      s.ada.run(createComponent, { company: s.world.otherCompany, salaryComponent: "Housing", type: "Earning", amount: 0n, account: s.world.salaries }),
      refuses(ComponentAccountNotInCompany),
      noEvents(),
    ),
  ],
});
