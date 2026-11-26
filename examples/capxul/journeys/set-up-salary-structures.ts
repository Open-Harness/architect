// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Salary Structure with its Salary Detail lines (decisions/CX-payroll.md). `create` refuses
// StructureWithoutEarnings; then, line by line over the earnings and then the deductions,
// StructureComponentNotInCompany and StructureComponentWrongType; then StructureLineWithoutAmount over every line;
// then StructureComponentRepeated; then the rule's SalaryStructureNameTaken. A line given 0 takes its component's
// amount. `submit` refuses StructureNetPayNegative; `cancel` refuses StructureInUse.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { SalaryStructureCancelled, SalaryStructureDrafted, SalaryStructureSubmitted } from "../blueprint/things/salary-structure/events.ts";
import {
  SalaryStructureNameTaken,
  StructureComponentNotInCompany,
  StructureComponentRepeated,
  StructureComponentWrongType,
  StructureLineWithoutAmount,
  StructureNetPayNegative,
  StructureWithoutEarnings,
} from "../blueprint/things/salary-structure/errors.ts";
import { machine as structures } from "../blueprint/things/salary-structure/machine.ts";
import createStructure from "../blueprint/things/salary-structure/verbs/create.ts";
import submitStructure from "../blueprint/things/salary-structure/verbs/submit.ts";
import cancelStructure from "../blueprint/things/salary-structure/verbs/cancel.ts";
import getStructure from "../blueprint/things/salary-structure/verbs/get.ts";
import structureLines from "../blueprint/things/salary-detail/verbs/list.ts";
import createComponent from "../blueprint/things/salary-component/verbs/create.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";

const USDC = 1_000_000n;
type Line = { readonly type: string; readonly line: bigint; readonly salaryComponent: string; readonly amount: bigint };
const lines = (p: { readonly items: ReadonlyArray<Line> }) => p.items.map((i) => [i.type, i.line, i.salaryComponent, i.amount]);
const totals = (a: { readonly totalEarning: bigint; readonly totalDeduction: bigint; readonly netPay: bigint }) => [a.totalEarning, a.totalDeduction, a.netPay];

export default Blueprint.journey("set up salary structures", {
  // Acme Trading's components Basic (an earning, 3,000 USDC by default), Housing (an earning, no default) and Pension (a
  // deduction, 150 USDC). Ada also runs Acme Logistics. Bo runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a pension component",
  steps: (s) => {
    const line = (salaryComponent: unknown, amount: bigint) => ({ salaryComponent, amount });
    const draft = (name: string, earnings: ReadonlyArray<ReturnType<typeof line>>, deductions: ReadonlyArray<ReturnType<typeof line>>) =>
      s.ada.run(createStructure, { company: s.world.company, salaryStructureName: name, earnings, deductions } as never);
    const basic = s.world.basic;
    const housing = s.world.housing;
    const pension = s.world.pensionComponent;
    return [
      s.step(
        "Bo can't draft a structure for Acme Trading",
        s.bo.run(createStructure, { company: s.world.company, salaryStructureName: "Engineers", earnings: [line(basic, 0n)], deductions: [] } as never),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["salary-structure.create.insert"] }),
      ),
      s.step(
        "a structure with no earning is refused",
        draft("Deductions only", [], [line(pension, 0n)]),
        refuses(StructureWithoutEarnings),
        noEvents(),
        spans({ absent: ["salary-structure.create.insert"] }),
      ),
      s.step("so is one with no line at all", draft("Empty", [], []), refuses(StructureWithoutEarnings), noEvents()),
      s.step(
        "Pension among the earnings is refused, naming it",
        draft("Wrong way round", [line(basic, 0n), line(pension, 0n)], []),
        refuses(StructureComponentWrongType, { salaryComponent: pension }),
        noEvents(),
      ),
      s.step(
        "Housing among the deductions too",
        draft("Wrong way round", [line(basic, 0n)], [line(pension, 0n), line(housing, 9n * USDC)]),
        refuses(StructureComponentWrongType, { salaryComponent: housing }),
        noEvents(),
      ),
      s.step(
        "a line that pays nothing is refused, naming it: Housing has no default",
        draft("Unpaid housing", [line(basic, 0n), line(housing, 0n)], [line(pension, 0n)]),
        refuses(StructureLineWithoutAmount, { salaryComponent: housing }),
        noEvents(),
      ),
      s.step(
        "the wrong type is judged before a line that pays nothing, even on a later line",
        draft("Unpaid housing", [line(housing, 0n), line(pension, 0n)], []),
        refuses(StructureComponentWrongType, { salaryComponent: pension }),
        noEvents(),
      ),
      s.step(
        "a component on two lines is refused, naming it",
        draft("Double basic", [line(basic, 0n), line(housing, 500n * USDC), line(basic, 100n * USDC)], []),
        refuses(StructureComponentRepeated, { salaryComponent: basic }),
        noEvents(),
      ),
      s.step(
        "a line that pays nothing is judged before a repeat",
        draft("Double basic", [line(basic, 0n), line(basic, 100n * USDC), line(housing, 0n)], []),
        refuses(StructureLineWithoutAmount, { salaryComponent: housing }),
        noEvents(),
      ),
      s.step(
        "no earning is judged before a component of the wrong type",
        draft("Deductions only", [], [line(basic, 0n)]),
        refuses(StructureWithoutEarnings),
        noEvents(),
      ),
      s.step(
        "Ada starts Acme Logistics' chart with a root group",
        s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Expenses", isGroup: true, rootType: "Expense" }),
      ),
      s.step("and a ledger under it", s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Wages", parentAccount: s.last.account, isGroup: false })),
      s.step(
        "and gives Acme Logistics its own Basic",
        s.ada.run(createComponent, { company: s.world.otherCompany, salaryComponent: "Basic", type: "Earning", amount: 1_000n * USDC, account: s.last.account }),
      ),
      s.step(
        "Acme Trading's structure can't pay Acme Logistics' Basic",
        draft("Borrowed", [line(basic, 0n), line(s.last.salaryComponent, 0n)], []),
        refuses(StructureComponentNotInCompany, { salaryComponent: s.last.salaryComponent }),
        noEvents(),
      ),
      s.step(
        "another company's component is judged line by line: before a later line of the wrong type",
        draft("Borrowed", [line(s.last.salaryComponent, 0n), line(pension, 0n)], []),
        refuses(StructureComponentNotInCompany, { salaryComponent: s.last.salaryComponent }),
        noEvents(),
      ),
      s.step(
        "and after an earlier one",
        draft("Borrowed", [line(pension, 0n), line(s.last.salaryComponent, 0n)], []),
        refuses(StructureComponentWrongType, { salaryComponent: pension }),
        noEvents(),
      ),
      s.step(
        "in the deductions too, after every earning",
        draft("Borrowed", [line(basic, 0n), line(housing, 0n)], [line(s.last.salaryComponent, 0n)]),
        refuses(StructureComponentNotInCompany, { salaryComponent: s.last.salaryComponent }),
        noEvents(),
      ),
      s.step(
        "Acme Logistics can't pay Acme Trading's Pension either",
        s.ada.run(createStructure, {
          company: s.world.otherCompany, salaryStructureName: "Drivers", earnings: [line(s.last.salaryComponent, 0n)], deductions: [line(pension, 0n)],
        } as never),
        refuses(StructureComponentNotInCompany, { salaryComponent: pension }),
        noEvents(),
      ),
      s.step(
        "Acme Logistics may have its own structure of that name, from its own Basic",
        s.ada.run(createStructure, { company: s.world.otherCompany, salaryStructureName: "Engineers", earnings: [line(s.last.salaryComponent, 0n)], deductions: [] } as never),
        expect(totals).toEqual([1_000n * USDC, 0n, 1_000n * USDC]),
        emits(SalaryStructureDrafted, { company: s.world.otherCompany, netPay: 1_000n * USDC }),
      ),
      s.step(
        "Ada drafts a structure: Basic at its own 3,000, Housing at 500, less Pension at 200, not its own 150",
        draft("Engineers", [line(basic, 0n), line(housing, 500n * USDC)], [line(pension, 200n * USDC)]),
        expect(totals).toEqual([3_500n * USDC, 200n * USDC, 3_300n * USDC]),
        emits(SalaryStructureDrafted, { company: s.world.company, netPay: 3_300n * USDC }),
        structures.isIn(s.last.salaryStructure, "draft"),
        spans({ present: ["salary-structure.create", "salary-structure.create.load", "salary-structure.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(getStructure, { id: s.last.salaryStructure }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor its lines", s.bo.run(structureLines, { salaryStructure: s.last.salaryStructure }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor submit it", s.bo.run(submitStructure, { salaryStructure: s.last.salaryStructure }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "a name already used in the company is refused, though Acme Logistics has one too",
        draft("Engineers", [line(basic, 0n)], []),
        refuses(SalaryStructureNameTaken),
        noEvents(),
      ),
      s.step(
        "and judged after the lines",
        draft("Engineers", [line(basic, 0n), line(basic, 1n)], []),
        refuses(StructureComponentRepeated, { salaryComponent: basic }),
        noEvents(),
      ),
      s.step(
        "a draft can't be cancelled",
        s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }),
        refuses(structures.notFrom, { state: "draft" }),
        noEvents(),
        spans({ absent: ["salary-structure.cancel.update"] }),
      ),
      s.step(
        "Ada submits it",
        s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure }),
        expect((a) => a.salaryStructure).toBe(s.last.salaryStructure),
        emits(SalaryStructureSubmitted, { salaryStructure: s.last.salaryStructure }),
        structures.isIn(s.last.salaryStructure, "submitted"),
        spans({ present: ["salary-structure.submit", "salary-structure.submit.update"] }),
      ),
      s.step(
        "its lines: earnings then deductions, each numbered from 1, a line given 0 paying its component's amount",
        s.ada.run(structureLines, { salaryStructure: s.last.salaryStructure }),
        expect(lines).toEqual([
          ["Earning", 1n, basic, 3_000n * USDC],
          ["Earning", 2n, housing, 500n * USDC],
          ["Deduction", 1n, pension, 200n * USDC],
        ]),
      ),
      s.step(
        "it can't be submitted twice",
        s.ada.run(submitStructure, { salaryStructure: s.last.items[0].salaryStructure }),
        refuses(structures.notFrom, { state: "submitted" }),
        noEvents(),
      ),
      s.step("Bo can't cancel it", s.bo.run(cancelStructure, { salaryStructure: s.last.items[0].salaryStructure }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nothing uses it, so Ada cancels it",
        s.ada.run(cancelStructure, { salaryStructure: s.last.items[0].salaryStructure }),
        emits(SalaryStructureCancelled, { salaryStructure: s.last.salaryStructure }),
        structures.isIn(s.last.salaryStructure, "cancelled"),
        spans({ present: ["salary-structure.cancel", "salary-structure.cancel.load", "salary-structure.cancel.update"] }),
      ),
      s.step("it can't be cancelled twice", s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }), refuses(structures.notFrom, { state: "cancelled" }), noEvents()),
      s.step("nor submitted again", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure }), refuses(structures.notFrom, { state: "cancelled" }), noEvents()),
      s.step(
        "it reads back cancelled, its totals kept",
        s.ada.run(getStructure, { id: s.last.salaryStructure }),
        expect((a) => [a.company, a.salaryStructureName, a.totalEarning, a.totalDeduction, a.netPay, a.state]).toEqual([
          s.world.company, "Engineers", 3_500n * USDC, 200n * USDC, 3_300n * USDC, "cancelled",
        ]),
      ),
      s.step(
        "Ada drafts another: Basic at 100 less Pension at its own 150, a net pay below nothing",
        draft("Interns", [line(basic, 100n * USDC)], [line(pension, 0n)]),
        expect(totals).toEqual([100n * USDC, 150n * USDC, -50n * USDC]),
        emits(SalaryStructureDrafted, { company: s.world.company, netPay: -50n * USDC }),
        structures.isIn(s.last.salaryStructure, "draft"),
      ),
      s.step(
        "it can't be submitted, and carries the net pay",
        s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure }),
        refuses(StructureNetPayNegative, { netPay: -50n * USDC }),
        noEvents(),
        spans({ absent: ["salary-structure.submit.update"] }),
      ),
      s.step("it stays a draft", s.ada.run(getStructure, { id: s.last.salaryStructure }), expect((a) => [a.netPay, a.state]).toEqual([-50n * USDC, "draft"])),
      s.step(
        "Ada drafts another: Basic at 150 less Pension at 150, a net pay of nothing",
        draft("Apprentices", [line(basic, 150n * USDC)], [line(pension, 150n * USDC)]),
        expect(totals).toEqual([150n * USDC, 150n * USDC, 0n]),
      ),
      s.step(
        "it can be submitted",
        s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure }),
        structures.isIn(s.last.salaryStructure, "submitted"),
      ),
      s.step(
        "Ada drafts another with no deduction: Housing at 1 base unit",
        draft("Leads", [line(housing, 1n), line(basic, 4_000n * USDC)], []),
        expect(totals).toEqual([4_000n * USDC + 1n, 0n, 4_000n * USDC + 1n]),
      ),
      s.step(
        "its lines keep the order given",
        s.ada.run(structureLines, { salaryStructure: s.last.salaryStructure }),
        expect(lines).toEqual([
          ["Earning", 1n, housing, 1n],
          ["Earning", 2n, basic, 4_000n * USDC],
        ]),
      ),
      s.step(
        "Ada adds an earning with no default",
        s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Overtime", type: "Earning", amount: 0n, account: s.world.salaries }),
      ),
      s.step(
        "with three lines paying nothing, the first is named",
        draft("Unpaid", [line(s.last.salaryComponent, 0n), line(basic, 0n), line(housing, 0n)], []),
        refuses(StructureLineWithoutAmount, { salaryComponent: s.last.salaryComponent }),
        noEvents(),
      ),
      s.step(
        "with two components repeated, the one on the first line repeating an earlier one is named",
        draft("Doubled", [line(basic, 0n), line(housing, 500n * USDC), line(housing, 1n), line(basic, 1n)], []),
        refuses(StructureComponentRepeated, { salaryComponent: housing }),
        noEvents(),
      ),
    ];
  },
});
