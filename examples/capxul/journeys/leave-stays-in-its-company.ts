// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Repeating a call under its
// request key answers what it answered the first time, which is how a later step finds an earlier record again.
// Capxul's own checks (decisions/CX-leave.md): an allocation and an application are for an employee of the company
// named, with a leave type of that company, and a new one is only for an employee still at work
// (decisions/CX-expense-leavers.md). What was opened before the employee left can still be finished.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  AllocateeHasLeft,
  AllocateeNotInCompany,
  AllocationTypeNotInCompany,
} from "../blueprint/things/leave-allocation/errors.ts";
import {
  ApplicantHasLeft,
  ApplicantNotInCompany,
  ApplicationTypeNotInCompany,
} from "../blueprint/things/leave-application/errors.ts";
import { LeaveApplicationApproved } from "../blueprint/things/leave-application/events.ts";
import { machine as allocations } from "../blueprint/things/leave-allocation/machine.ts";
import { machine as applications } from "../blueprint/things/leave-application/machine.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import addType from "../blueprint/things/leave-type/verbs/create.ts";
import allocate from "../blueprint/things/leave-allocation/verbs/create.ts";
import submit from "../blueprint/things/leave-allocation/verbs/submit.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import approve from "../blueprint/things/leave-application/verbs/approve.ts";
import get from "../blueprint/things/leave-application/verbs/get.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import { days } from "../blueprint/values/leave-journeys.ts";

export default Blueprint.journey("leave stays in its company", {
  // Olga works at Acme Trading, which Ada runs, and has 10 days of Annual Leave for 2027. She has asked for 1 to 3 March
  // 2027 off. Bo is signed in and sets up Bo Ltd, with its own Annual Leave.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave application",
  steps: (s) => {
    const boLtd = () => s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Tanzania", defaultCurrency: "TZS" }, { request: "bo-ltd" });
    const boAnnual = (company: unknown) =>
      s.bo.run(addType, { company: company as never, leaveTypeName: "ANNUAL-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: false }, { request: "bo-annual" });
    /** An allocation for Olga, by Ada unless said otherwise. */
    const allocation = (company: unknown, leaveType: unknown, fromDate: string, toDate: string) => ({
      company: company as never, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, newLeavesAllocated: days("2"),
    });
    /** An application for Olga. */
    const application = (company: unknown, leaveType: unknown, fromDate: string, toDate: string) => ({
      company: company as never, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, reason: "Rest",
    });
    return [
      s.step("Bo sets up Bo Ltd", boLtd(), expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/)),
      s.step("and adds Annual Leave to it", boAnnual(s.last.company), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Ada can't give Olga Bo's Annual Leave",
        s.ada.run(allocate, allocation(s.world.company, s.last.leaveType, "2028-01-01", "2028-12-31")),
        refuses(AllocationTypeNotInCompany),
        noEvents(),
      ),
      s.step(
        "even ending before it starts, which it is refused for after",
        s.ada.run(allocate, allocation(s.world.company, s.last.leaveType, "2028-01-02", "2028-01-01")),
        refuses(AllocationTypeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Olga can't ask for Bo's Annual Leave",
        s.olga.run(apply, application(s.world.company, s.last.leaveType, "2027-04-05", "2027-04-06")),
        refuses(ApplicationTypeNotInCompany),
        noEvents(),
      ),
      s.step(
        "even ending before it starts, which it is refused for after, again",
        s.olga.run(apply, application(s.world.company, s.last.leaveType, "2027-04-06", "2027-04-05")),
        refuses(ApplicationTypeNotInCompany),
        noEvents(),
      ),
      s.step("Bo looks up Bo Ltd again", boLtd(), expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/)),
      s.step(
        "Bo can't give Olga leave in Bo Ltd, with Acme Trading's type, for her company first",
        s.bo.run(allocate, allocation(s.last.company, s.world.leaveType, "2028-01-01", "2028-12-31")),
        refuses(AllocateeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Olga can't ask for leave in Bo Ltd, for her company first",
        s.olga.run(apply, application(s.last.company, s.world.leaveType, "2027-04-05", "2027-04-06")),
        refuses(ApplicantNotInCompany),
        noEvents(),
      ),
      s.step(
        "Bo can't ask for Olga's leave in Acme Trading",
        s.bo.run(apply, application(s.world.company, s.world.leaveType, "2027-04-05", "2027-04-06")),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "Ada drafts Olga's Annual Leave for 2028",
        s.ada.run(allocate, allocation(s.world.company, s.world.leaveType, "2028-01-01", "2028-12-31"), { request: "olga-2028" }),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "Olga leaves on 31 March 2027",
        s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2027-03-31" }),
        expect((a) => a.relievingDate).toEqual("2027-03-31"),
      ),
      s.step(
        "Ada can't give her new leave",
        s.ada.run(allocate, allocation(s.world.company, s.world.leaveType, "2029-01-01", "2029-12-31")),
        refuses(AllocateeHasLeft),
        noEvents(),
      ),
      s.step(
        "even ending before it starts, which it is refused for after, a third time",
        s.ada.run(allocate, allocation(s.world.company, s.world.leaveType, "2029-01-02", "2029-01-01")),
        refuses(AllocateeHasLeft),
        noEvents(),
      ),
      s.step(
        "Olga can't ask for new leave",
        s.olga.run(apply, application(s.world.company, s.world.leaveType, "2027-04-05", "2027-04-06")),
        refuses(ApplicantHasLeft),
        noEvents(),
      ),
      s.step(
        "nor can Ada for her, ending before it starts too",
        s.ada.run(apply, application(s.world.company, s.world.leaveType, "2027-04-06", "2027-04-05")),
        refuses(ApplicantHasLeft),
        noEvents(),
      ),
      s.step("Bo looks up Bo Ltd once more", boLtd(), expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/)),
      s.step(
        "Bo can't give her leave in Bo Ltd, for her company first",
        s.bo.run(allocate, allocation(s.last.company, s.world.leaveType, "2029-01-01", "2029-12-31")),
        refuses(AllocateeNotInCompany),
        noEvents(),
      ),
      s.step(
        "nor ask for it there, for her company first",
        s.bo.run(apply, application(s.last.company, s.world.leaveType, "2027-04-05", "2027-04-06")),
        refuses(ApplicantNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada approves the leave Olga asked for before she left",
        s.ada.run(approve, { leaveApplication: s.world.leaveApplication }),
        expect((a) => [a.leaveApplication, a.marked, a.changed]).toEqual([s.world.leaveApplication, 3n, 0n]),
        emits(LeaveApplicationApproved, { leaveApplication: s.world.leaveApplication, marked: 3n, changed: 0n }),
        applications.isIn(s.world.leaveApplication, "approved"),
      ),
      s.step(
        "Olga reads it back approved",
        s.olga.run(get, { id: s.world.leaveApplication }),
        expect((a) => [a.employee, a.fromDate, a.toDate, a.state]).toEqual([s.world.employee, "2027-03-01", "2027-03-03", "approved"]),
        noEvents(),
      ),
      s.step(
        "Ada sends the 2028 draft again under its request key, and gets it back",
        s.ada.run(allocate, allocation(s.world.company, s.world.leaveType, "2028-01-01", "2028-12-31"), { request: "olga-2028" }),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "she can submit it, made before Olga left",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        allocations.isIn(s.last.leaveAllocation, "submitted"),
      ),
    ];
  },
});
