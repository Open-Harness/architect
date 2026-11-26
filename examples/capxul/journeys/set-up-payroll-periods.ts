// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Payroll Period (decisions/CX-payroll.md). `create` refuses PayrollPeriodEndsBeforeStart, then
// PayrollPeriodOverlaps (both ends counted, the company's own periods only, naming the earliest-starting one), then the
// rule's PayrollPeriodNameTaken.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PayrollPeriodCreated } from "../blueprint/things/payroll-period/events.ts";
import { PayrollPeriodEndsBeforeStart, PayrollPeriodNameTaken, PayrollPeriodOverlaps } from "../blueprint/things/payroll-period/errors.ts";
import { machine as periods } from "../blueprint/things/payroll-period/machine.ts";
import createPeriod from "../blueprint/things/payroll-period/verbs/create.ts";
import getPeriod from "../blueprint/things/payroll-period/verbs/get.ts";

export default Blueprint.journey("set up payroll periods", {
  // Acme Trading and Acme Logistics, both Ada's. Bo runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "two companies",
  steps: (s) => {
    const period = (name: string, startDate: string, endDate: string, company: unknown = s.world.company) =>
      s.ada.run(createPeriod, { company, payrollPeriodName: name, startDate, endDate } as never);
    return [
      s.step(
        "Bo can't set up a period for Acme Trading",
        s.bo.run(createPeriod, { company: s.world.company, payrollPeriodName: "2026", startDate: "2026-01-01", endDate: "2026-12-31" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["payroll-period.create.insert"] }),
      ),
      s.step(
        "a period ending before it starts is refused, naming its first day",
        period("Backwards", "2026-12-31", "2026-12-30"),
        refuses(PayrollPeriodEndsBeforeStart, { startDate: "2026-12-31" }),
        noEvents(),
        spans({ absent: ["payroll-period.create.insert"] }),
      ),
      s.step(
        "Ada sets up 2026, from April 2026 to March 2027",
        period("2026", "2026-04-01", "2027-03-31"),
        emits(PayrollPeriodCreated, { company: s.world.company, startDate: "2026-04-01", endDate: "2027-03-31" }),
        periods.isIn(s.last.payrollPeriod, "active"),
        spans({ present: ["payroll-period.create", "payroll-period.create.load", "payroll-period.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(getPeriod, { id: s.last.payrollPeriod }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "it reads back as set up",
        s.ada.run(getPeriod, { id: s.last.payrollPeriod }),
        expect((a) => [a.company, a.payrollPeriodName, a.startDate, a.endDate, a.state]).toEqual([s.world.company, "2026", "2026-04-01", "2027-03-31", "active"]),
      ),
      s.step("a one-day period is allowed", period("Audit day", "2027-04-01", "2027-04-01")),
      s.step(
        "a period sharing only 2026's last day is refused",
        period("Overlap end", "2027-03-31", "2027-03-31"),
        refuses(PayrollPeriodOverlaps),
        noEvents(),
      ),
      s.step(
        "one ending on 2026's first day too",
        period("Overlap start", "2026-03-01", "2026-04-01"),
        refuses(PayrollPeriodOverlaps),
        noEvents(),
      ),
      s.step(
        "one inside it too",
        period("Inside", "2026-06-01", "2026-06-30"),
        refuses(PayrollPeriodOverlaps),
        noEvents(),
      ),
      s.step("but one ending the day before it is allowed", period("2025", "2025-04-01", "2026-03-31")),
      s.step(
        "one holding 2025, 2026 and the audit day names 2025, which starts first",
        period("Everything", "2025-01-01", "2027-12-31"),
        refuses(PayrollPeriodOverlaps, { payrollPeriod: s.last.payrollPeriod }),
        noEvents(),
      ),
      s.step(
        "a period ending before it starts is judged before an overlap",
        period("Backwards", "2026-06-30", "2026-06-01"),
        refuses(PayrollPeriodEndsBeforeStart, { startDate: "2026-06-30" }),
        noEvents(),
      ),
      s.step(
        "a name already used is refused",
        period("2026", "2030-01-01", "2030-12-31"),
        refuses(PayrollPeriodNameTaken),
        noEvents(),
      ),
      s.step(
        "an overlap is judged before a name",
        period("2026", "2026-05-01", "2026-05-31"),
        refuses(PayrollPeriodOverlaps),
        noEvents(),
      ),
      s.step(
        "Acme Logistics may have its own 2026 over the same days: each company's periods are its own",
        period("2026", "2026-04-01", "2027-03-31", s.world.otherCompany),
        emits(PayrollPeriodCreated, { company: s.world.otherCompany, startDate: "2026-04-01", endDate: "2027-03-31" }),
      ),
      s.step("it reads back Acme Logistics'", s.ada.run(getPeriod, { id: s.last.payrollPeriod }), expect((a) => [a.company, a.payrollPeriodName]).toEqual([s.world.otherCompany, "2026"])),
    ];
  },
});
