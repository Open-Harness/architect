// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Repeating a call under its
// request key answers what it answered the first time, which is how a later step finds an earlier record again.
// HRMS's validate_dates_across_allocation and validate_balance_leaves (decisions/CX-leave.md): one submitted allocation
// covers the whole leave, and its balance is its leaves allocated less the days of every approved application of the
// employee and type inside it. Open, rejected and cancelled applications take nothing. Approve judges the balance again
// (call 2), so two open applications that each fit can't both be approved. Leave without pay needs neither.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { InsufficientLeaveBalance, NoAllocationCovers } from "../blueprint/things/leave-application/errors.ts";
import { LeaveApplicationApproved } from "../blueprint/things/leave-application/events.ts";
import { machine as applications } from "../blueprint/things/leave-application/machine.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import approve from "../blueprint/things/leave-application/verbs/approve.ts";
import cancel from "../blueprint/things/leave-application/verbs/cancel.ts";
import addType from "../blueprint/things/leave-type/verbs/create.ts";
import allocate from "../blueprint/things/leave-allocation/verbs/create.ts";
import submit from "../blueprint/things/leave-allocation/verbs/submit.ts";
import { days, daysOf } from "../blueprint/values/leave-journeys.ts";

export default Blueprint.journey("leave balance", {
  // Olga works at Acme Trading, which Ada runs, and has 10 days of Annual Leave for 2027 (at most 5 in a row, holidays
  // not counted; the company keeps no holiday list).
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "a leave allocation",
  steps: (s) => {
    /** Olga asks for leave of a type, Annual Leave unless named, under a request key so a later step finds it again. */
    const ask = (fromDate: string, toDate: string, request: string, leaveType: unknown = s.world.leaveType) =>
      s.olga.run(apply, { company: s.world.company, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, reason: "Rest" }, { request });
    const sick = () =>
      s.ada.run(addType, { company: s.world.company, leaveTypeName: "SICK-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: true }, { request: "sick" });
    const unpaid = () =>
      s.ada.run(addType, { company: s.world.company, leaveTypeName: "UNPAID-LV", maxContinuousDaysAllowed: 0n, isLwp: true, includeHoliday: true }, { request: "unpaid" });
    const give = (leaveType: unknown, fromDate: string, toDate: string, leaves: string, request: string) =>
      s.ada.run(allocate, {
        company: s.world.company, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, newLeavesAllocated: days(leaves),
      }, { request });
    return [
      s.step("Olga asks for Monday 1 to Friday 5 March 2027", ask("2027-03-01", "2027-03-05", "first-week"), expect((a) => daysOf(a.totalLeaveDays)).toEqual("5")),
      s.step(
        "Ada approves it: 5 of her 10 days are taken",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationApproved, { marked: 5n, changed: 0n }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step("Olga asks for 15 to 19 March, 5 days", ask("2027-03-15", "2027-03-19", "third-week"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "and for 22 to 26 March, 5 more: an open application takes nothing, so both fit",
        ask("2027-03-22", "2027-03-26", "fourth-week"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("5"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step("Olga sends the third week again under its request key", ask("2027-03-15", "2027-03-19", "third-week"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "Ada approves it: all 10 days are taken",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationApproved, { marked: 5n }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step("Olga sends the fourth week again under its request key", ask("2027-03-22", "2027-03-26", "fourth-week"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "Ada can't approve it now: no day is left",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(InsufficientLeaveBalance),
        noEvents(),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "nor can Olga ask for Monday 5 April, one day",
        ask("2027-04-05", "2027-04-05", "april-5"),
        refuses(InsufficientLeaveBalance),
        noEvents(),
      ),
      s.step(
        "a day inside the third week is refused for the balance before its overlap",
        ask("2027-03-17", "2027-03-17", "inside-third-week"),
        refuses(InsufficientLeaveBalance),
        noEvents(),
      ),
      s.step("Olga sends the third week again under its request key, again", ask("2027-03-15", "2027-03-19", "third-week"), applications.isIn(s.last.leaveApplication, "approved")),
      s.step(
        "Ada cancels it, approved: its 5 days are given back",
        s.ada.run(cancel, { leaveApplication: s.last.leaveApplication }),
        applications.isIn(s.last.leaveApplication, "cancelled"),
      ),
      s.step("Olga sends the fourth week again under its request key, again", ask("2027-03-22", "2027-03-26", "fourth-week"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "Ada approves it now: the 5 days fit exactly",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationApproved, { marked: 5n, changed: 0n }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step(
        "Monday 5 April is still refused: all 10 are taken again",
        ask("2027-04-05", "2027-04-05", "april-5-again"),
        refuses(InsufficientLeaveBalance),
        noEvents(),
      ),
      // A balance of two and a half days.
      s.step("Ada adds Sick Leave, holidays counted, no limit", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step("and gives Olga two and a half days of it for 2027", give(s.last.leaveType, "2027-01-01", "2027-12-31", "2.5", "sick-2027"), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("and submits it", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("Ada looks up Sick Leave", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Olga can't take 3 days of it, 5 to 7 April: only two and a half are given",
        ask("2027-04-05", "2027-04-07", "sick-three", s.last.leaveType),
        refuses(InsufficientLeaveBalance),
        noEvents(),
      ),
      s.step("Ada looks up Sick Leave, again", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Olga takes two days of it, 5 and 6 April: her Annual Leave taken doesn't count toward it",
        ask("2027-04-05", "2027-04-06", "sick-two", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("2"),
      ),
      s.step(
        "Ada approves them",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationApproved, { marked: 2n, changed: 0n }),
      ),
      s.step("Ada looks up Sick Leave, a third time", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "half a day is left, so 7 April is refused",
        ask("2027-04-07", "2027-04-07", "sick-one", s.last.leaveType),
        refuses(InsufficientLeaveBalance),
        noEvents(),
      ),
      // The balance is the covering allocation's: other periods' approved days don't count.
      s.step("Ada gives Olga 1 day of Annual Leave for 2028", give(s.world.leaveType, "2028-01-01", "2028-12-31", "1", "annual-2028"), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("and submits it, again", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step(
        "Olga takes Monday 3 January 2028: 2027's days taken don't count",
        ask("2028-01-03", "2028-01-03", "jan-2028"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "and it is approved",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step(
        "a leave from 31 December 2027 to 4 January 2028 is refused: no one allocation covers it",
        ask("2027-12-31", "2028-01-04", "across-years"),
        refuses(NoAllocationCovers),
        noEvents(),
      ),
      s.step("so is one in 2029, which nothing covers", ask("2029-01-08", "2029-01-08", "in-2029"), refuses(NoAllocationCovers), noEvents()),
      s.step("Ada drafts 5 days of Annual Leave for 2029, and doesn't submit it", give(s.world.leaveType, "2029-01-01", "2029-12-31", "5", "draft-2029"), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("a leave in 2029 is still refused: a draft gives nothing", ask("2029-01-08", "2029-01-08", "in-2029-again"), refuses(NoAllocationCovers), noEvents()),
      // Leave without pay needs no allocation and no balance.
      s.step("Ada adds Leave Without Pay", unpaid(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Olga takes it from Monday 7 to Friday 11 June 2027, with no allocation of it",
        ask("2027-06-07", "2027-06-11", "unpaid-june", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("5"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "and it is approved, again",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationApproved, { marked: 5n, changed: 0n }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step("Ada looks up Leave Without Pay", unpaid(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "and Olga takes it in 2029 too, which no allocation covers",
        ask("2029-02-05", "2029-02-06", "unpaid-2029", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("2"),
      ),
    ];
  },
});
