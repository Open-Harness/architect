// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Repeating a call under its
// request key answers what it answered the first time, which is how a later step finds an earlier record again.
// HRMS's validate_leave_overlap: no two open or approved applications of an employee, of any type, share a day.
// HRMS's validate_max_days: with the open or approved applications of the same type that run on from it day after day,
// a leave takes at most its type's days in a row; 0 is no limit (decisions/CX-leave.md). Rejected and cancelled
// applications neither overlap nor run on. LeaveOverlaps is judged before LeaveTooLong.
import { Blueprint, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { LeaveOverlaps, LeaveTooLong, NoAllocationCovers } from "../blueprint/things/leave-application/errors.ts";
import { machine as applications } from "../blueprint/things/leave-application/machine.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import approve from "../blueprint/things/leave-application/verbs/approve.ts";
import reject from "../blueprint/things/leave-application/verbs/reject.ts";
import cancel from "../blueprint/things/leave-application/verbs/cancel.ts";
import addType from "../blueprint/things/leave-type/verbs/create.ts";
import allocate from "../blueprint/things/leave-allocation/verbs/create.ts";
import submit from "../blueprint/things/leave-allocation/verbs/submit.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import { days, daysOf } from "../blueprint/values/leave-journeys.ts";

export default Blueprint.journey("overlapping leave", {
  // Olga works at Acme Trading, which Ada runs, and has 10 days of Annual Leave for 2027 (at most 5 in a row). She has
  // asked for Monday 1 to Wednesday 3 March 2027, which is open. Bo is signed in; Ada hires him partway.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave application",
  steps: (s) => {
    const ask = (fromDate: string, toDate: string, request: string, leaveType: unknown = s.world.leaveType) =>
      s.olga.run(apply, { company: s.world.company, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, reason: "Rest" }, { request });
    const sick = () =>
      s.ada.run(addType, { company: s.world.company, leaveTypeName: "SICK-LV", maxContinuousDaysAllowed: 2n, isLwp: false, includeHoliday: true }, { request: "sick" });
    const hireBo = () =>
      s.ada.run(hire, {
        company: s.world.company, person: s.bo.person, firstName: "Bo Mwangi", gender: "Male", dateOfBirth: "1990-07-01", dateOfJoining: "2026-02-01",
        department: s.world.department, designation: s.world.designation,
      }, { request: "hire-bo" });
    return [
      // The two overlapping applications: the second is refused while the first is open.
      s.step("Olga can't ask for 3 to 4 March: it shares her open leave's last day", ask("2027-03-03", "2027-03-04", "o1"), refuses(LeaveOverlaps), noEvents()),
      s.step("nor for 26 February to 1 March, sharing its first", ask("2027-02-26", "2027-03-01", "o2"), refuses(LeaveOverlaps), noEvents()),
      s.step("nor for 2 March, inside it", ask("2027-03-02", "2027-03-02", "o3"), refuses(LeaveOverlaps), noEvents()),
      s.step("nor for 28 February to 5 March, around it, which is too long as well", ask("2027-02-28", "2027-03-05", "o4"), refuses(LeaveOverlaps), noEvents()),
      s.step("Ada adds Sick Leave, at most 2 days in a row", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "and gives Olga 5 days of it for 2027",
        s.ada.run(allocate, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-12-31", newLeavesAllocated: days("5"),
        }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
      ),
      s.step("and submits it", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("Ada looks up Sick Leave", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step("Olga can't ask for Sick Leave on 2 March either: any type overlaps", ask("2027-03-02", "2027-03-02", "o5", s.last.leaveType), refuses(LeaveOverlaps), noEvents()),
      // Days in a row, with the applications that run on from it.
      s.step(
        "she asks for Thursday 4 and Friday 5 March: with her open leave, 5 days in a row",
        ask("2027-03-04", "2027-03-05", "thu-fri"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("2"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step("Saturday 6 March would make 6 in a row", ask("2027-03-06", "2027-03-06", "r1"), refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }), noEvents()),
      s.step("so would Sunday 28 February, before them", ask("2027-02-28", "2027-02-28", "r2"), refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }), noEvents()),
      s.step("Olga sends Thursday and Friday again under their request key", ask("2027-03-04", "2027-03-05", "thu-fri"), applications.isIn(s.last.leaveApplication, "open")),
      s.step("Ada rejects them", s.ada.run(reject, { leaveApplication: s.last.leaveApplication }), applications.isIn(s.last.leaveApplication, "rejected")),
      s.step(
        "Saturday 6 March is allowed now: the rejected days don't run on",
        ask("2027-03-06", "2027-03-06", "sat"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "and so is Thursday 4 March: the rejected leave doesn't overlap",
        ask("2027-03-04", "2027-03-04", "thu"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Friday 5 March would join them, 1 to 6 March, 6 in a row",
        ask("2027-03-05", "2027-03-05", "r3"),
        refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }),
        noEvents(),
      ),
      s.step("Ada looks up Sick Leave again", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Sick Leave on Friday 5 March is allowed: Annual Leave either side doesn't run on into another type",
        ask("2027-03-05", "2027-03-05", "sick-fri", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step("Ada looks up Sick Leave a third time", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Sick Leave from Sunday 7 to Monday 8 March is allowed: Saturday's Annual Leave breaks the run",
        ask("2027-03-07", "2027-03-08", "sick-sun-mon", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("2"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step("Ada looks up Sick Leave a fourth time", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Sick Leave on Tuesday 9 March would run 3 days with them, over its 2",
        ask("2027-03-09", "2027-03-09", "r4", s.last.leaveType),
        refuses(LeaveTooLong, { maxContinuousDaysAllowed: 2n }),
        noEvents(),
      ),
      // Approved applications overlap too, and cancelled ones don't.
      s.step(
        "Ada approves 1 to 3 March",
        s.ada.run(approve, { leaveApplication: s.world.leaveApplication }),
        applications.isIn(s.world.leaveApplication, "approved"),
      ),
      s.step("Olga can't ask for 2 March, inside her approved leave", ask("2027-03-02", "2027-03-02", "o6"), refuses(LeaveOverlaps), noEvents()),
      s.step("Ada cancels it", s.ada.run(cancel, { leaveApplication: s.world.leaveApplication }), applications.isIn(s.world.leaveApplication, "cancelled")),
      s.step(
        "2 March is allowed now",
        ask("2027-03-02", "2027-03-02", "tue"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      // At most, and one over.
      s.step(
        "Monday 15 to Friday 19 March, 5 days, is allowed",
        ask("2027-03-15", "2027-03-19", "five"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("5"),
      ),
      s.step("Monday 22 to Saturday 27 March, 6 days, isn't", ask("2027-03-22", "2027-03-27", "r5"), refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }), noEvents()),
      s.step(
        "Ada adds Study Leave, unpaid, with no limit",
        s.ada.run(addType, { company: s.world.company, leaveTypeName: "STUDY-LV", maxContinuousDaysAllowed: 0n, isLwp: true, includeHoliday: true }),
        expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
      ),
      s.step(
        "Olga takes 40 days of it in a row, 1 June to 10 July 2027",
        ask("2027-06-01", "2027-07-10", "study", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("40"),
      ),
      // Another employee's leave doesn't overlap Olga's.
      s.step("Ada hires Bo", hireBo(), expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/)),
      s.step(
        "Bo can't take Annual Leave yet: Olga's allocation doesn't cover him",
        s.bo.run(apply, { company: s.world.company, employee: s.last.employee, leaveType: s.world.leaveType, fromDate: "2027-04-05", toDate: "2027-04-05", reason: "Rest" }),
        refuses(NoAllocationCovers),
        noEvents(),
      ),
      s.step(
        "and gives him 5 days of Annual Leave for 2027",
        s.ada.run(allocate, {
          company: s.world.company, employee: s.last.employee, leaveType: s.world.leaveType, fromDate: "2027-01-01", toDate: "2027-12-31", newLeavesAllocated: days("5"),
        }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
      ),
      s.step("and submits his", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("Ada sends Bo's hiring again under its request key, and gets him back", hireBo(), expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/)),
      s.step(
        "Bo asks for Tuesday 2 March himself: Olga's open leave that day isn't his",
        s.bo.run(apply, { company: s.world.company, employee: s.last.employee, leaveType: s.world.leaveType, fromDate: "2027-03-02", toDate: "2027-03-02", reason: "Rest" }),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      // One employee's approved days don't take another's balance.
      s.step("Olga sends 15 to 19 March again under its request key", ask("2027-03-15", "2027-03-19", "five"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "Ada approves Olga's 5 days",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
      s.step("Ada sends Bo's hiring again, to find him", hireBo(), expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/)),
      s.step(
        "Bo asks for the same 15 to 19 March, all 5 of his days: Olga's approved days aren't his",
        s.bo.run(apply, { company: s.world.company, employee: s.last.employee, leaveType: s.world.leaveType, fromDate: "2027-03-15", toDate: "2027-03-19", reason: "Rest" }),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("5"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "and Ada approves them",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        expect((a) => [a.marked, a.changed]).toEqual([5n, 0n]),
        applications.isIn(s.last.leaveApplication, "approved"),
      ),
    ];
  },
});
