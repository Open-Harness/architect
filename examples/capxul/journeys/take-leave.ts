// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The leave journey end to end (decisions/CX-leave.md): an allocation, an application, its approval, which marks every
// leave day On Leave in attendance (HRMS's update_attendance: a day already marked is changed, the rest are new), and
// attendance.mark refusing a day an approved leave covers (HRMS's check_leave_record).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceOnLeave } from "../blueprint/things/attendance/errors.ts";
import { LeaveApplied, LeaveApplicationApproved, LeaveApplicationRejected, LeaveApplicationCancelled } from "../blueprint/things/leave-application/events.ts";
import { machine as applications } from "../blueprint/things/leave-application/machine.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import approve from "../blueprint/things/leave-application/verbs/approve.ts";
import reject from "../blueprint/things/leave-application/verbs/reject.ts";
import cancel from "../blueprint/things/leave-application/verbs/cancel.ts";
import get from "../blueprint/things/leave-application/verbs/get.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import { daysOf } from "../blueprint/values/leave-journeys.ts";

type Item = { readonly id: string; readonly company: string; readonly employee: string; readonly attendanceDate: string; readonly status: string; readonly state: string };
/** A page's items as [day, status, company, employee, state], by day: the order a handler marks them in is its own. */
const rows = (p: { readonly items: ReadonlyArray<Item> }) =>
  [...p.items].sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.attendanceDate, i.status, i.company, i.employee, i.state]);

export default Blueprint.journey("take leave", {
  // Olga works at Acme Trading, which Ada runs, and has 10 days of Annual Leave for 2027 (at most 5 in a row, holidays
  // not counted; the company keeps no holiday list). Bo is signed in and runs nothing of hers.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave allocation",
  steps: (s) => {
    const theirs = (want: ReadonlyArray<readonly [string, string]>) => want.map((d) => [...d, s.world.company, s.world.employee, "marked"]);
    const leave = (fromDate: string, toDate: string, reason: string) =>
      ({ company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType, fromDate, toDate, reason });
    /** Olga's first leave, under its request key: sending it again answers the same application. */
    const first = () => s.olga.run(apply, leave("2027-03-01", "2027-03-04", "Family visit"), { request: "first-leave" });
    const again = (title: string) => s.step(title, first(), expect((a) => a.leaveApplication).toMatch(/^lap_[0-9a-z]+$/));
    return [
      s.step(
        "Ada marks Olga absent on Tuesday 2 March 2027",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-02", status: "Absent" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "and present on Friday 26 February, the working day before",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-02-26", status: "Present" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "Olga asks for Annual Leave from Monday 1 to Thursday 4 March 2027: four days",
        first(),
        expect((a) => [daysOf(a.totalLeaveDays), /^lap_[0-9a-z]+$/.test(a.leaveApplication)]).toEqual(["4", true]),
        emits(LeaveApplied, { company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType }),
        applications.isIn(s.last.leaveApplication, "open"),
        spans({ present: ["leave-application.create", "leave-application.create.load", "leave-application.create.insert"] }),
      ),
      s.step(
        "it reads back open, as she asked it",
        s.olga.run(get, { id: s.last.leaveApplication }),
        expect((a) => [a.company, a.employee, a.leaveType, a.fromDate, a.toDate, a.reason, daysOf(a.totalLeaveDays), a.state]).toEqual([
          s.world.company, s.world.employee, s.world.leaveType, "2027-03-01", "2027-03-04", "Family visit", "4", "open",
        ]),
        noEvents(),
      ),
      again("Olga sends her leave again under its request key, and gets it back"),
      s.step(
        "Bo can't read it",
        s.bo.run(get, { id: s.last.leaveApplication }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "Olga can't approve her own leave",
        s.olga.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["leave-application.approve", "leave-application.approve.mark"] }),
      ),
      s.step(
        "nor can Bo",
        s.bo.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "nor can Olga reject or cancel it",
        s.olga.run(cancel, { leaveApplication: s.last.leaveApplication }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "Ada approves it: three days are new and the absent Tuesday changes",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        expect((a) => [a.leaveApplication, a.marked, a.changed]).toEqual([s.last.leaveApplication, 3n, 1n]),
        emits(LeaveApplicationApproved, { leaveApplication: s.last.leaveApplication, marked: 3n, changed: 1n }),
        applications.isIn(s.last.leaveApplication, "approved"),
        spans({ present: ["leave-application.approve", "leave-application.approve.load", "leave-application.approve.mark"] }),
      ),
      s.step(
        "Olga's days read On Leave, and the Friday before as it was",
        s.olga.run(list, { employee: s.world.employee }),
        expect((p) => rows(p)).toEqual(theirs([
          ["2027-02-26", "Present"],
          ["2027-03-01", "On Leave"],
          ["2027-03-02", "On Leave"],
          ["2027-03-03", "On Leave"],
          ["2027-03-04", "On Leave"],
        ])),
        noEvents(),
      ),
      again("Olga sends her leave again, and gets it back approved"),
      s.step(
        "it reads back approved",
        s.ada.run(get, { id: s.last.leaveApplication }),
        expect((a) => [a.fromDate, a.toDate, daysOf(a.totalLeaveDays), a.state]).toEqual(["2027-03-01", "2027-03-04", "4", "approved"]),
        noEvents(),
      ),
      again("Olga sends her leave a third time, and gets it back"),
      s.step(
        "it can't be approved twice",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(applications.notFrom, { state: "approved" }),
        noEvents(),
      ),
      s.step(
        "nor rejected once approved",
        s.ada.run(reject, { leaveApplication: s.last.leaveApplication }),
        refuses(applications.notFrom, { state: "approved" }),
        noEvents(),
      ),
      s.step(
        "Ada can't mark Olga present on Wednesday 3 March: she is on leave",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-03", status: "Present" }),
        refuses(AttendanceOnLeave, { leaveApplication: s.last.leaveApplication }),
        noEvents(),
        spans({ absent: ["attendance.mark.insert"] }),
      ),
      s.step(
        "nor absent on the first day",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-01", status: "Absent" }),
        refuses(AttendanceOnLeave, { leaveApplication: s.last.leaveApplication }),
        noEvents(),
      ),
      s.step(
        "nor on the last",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-04", status: "Work From Home" }),
        refuses(AttendanceOnLeave, { leaveApplication: s.last.leaveApplication }),
        noEvents(),
      ),
      s.step(
        "she can mark Olga present on Friday 5 March, the day after",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-05", status: "Present" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "Olga asks for Monday 8 March",
        s.olga.run(apply, leave("2027-03-08", "2027-03-08", "Errands")),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Ada can still mark her that day while it is open",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-08", status: "Absent" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "Olga asks for Tuesday 9 March",
        s.olga.run(apply, leave("2027-03-09", "2027-03-09", "Errands")),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Ada rejects it: no day is marked",
        s.ada.run(reject, { leaveApplication: s.last.leaveApplication }),
        expect((a) => a.leaveApplication).toMatch(/^lap_[0-9a-z]+$/),
        emits(LeaveApplicationRejected, {}),
        applications.isIn(s.last.leaveApplication, "rejected"),
      ),
      s.step(
        "it can't be approved once rejected",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(applications.notFrom, { state: "rejected" }),
        noEvents(),
      ),
      s.step(
        "nor cancelled",
        s.ada.run(cancel, { leaveApplication: s.last.leaveApplication }),
        refuses(applications.notFrom, { state: "rejected" }),
        noEvents(),
      ),
      s.step(
        "Ada can mark Olga present on that Tuesday",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-09", status: "Present" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "Olga asks for Wednesday 10 March",
        s.olga.run(apply, leave("2027-03-10", "2027-03-10", "Errands")),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Ada cancels it while open",
        s.ada.run(cancel, { leaveApplication: s.last.leaveApplication }),
        emits(LeaveApplicationCancelled, {}),
        applications.isIn(s.last.leaveApplication, "cancelled"),
      ),
      s.step(
        "it can't be approved once cancelled",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(applications.notFrom, { state: "cancelled" }),
        noEvents(),
      ),
      s.step(
        "Ada can mark Olga present on that Wednesday",
        s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-10", status: "Present" }),
        expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      ),
      s.step(
        "Olga's attendance reads every day as marked, the leave days On Leave",
        s.ada.run(list, { employee: s.world.employee }),
        expect((p) => rows(p)).toEqual(theirs([
          ["2027-02-26", "Present"],
          ["2027-03-01", "On Leave"],
          ["2027-03-02", "On Leave"],
          ["2027-03-03", "On Leave"],
          ["2027-03-04", "On Leave"],
          ["2027-03-05", "Present"],
          ["2027-03-08", "Absent"],
          ["2027-03-09", "Present"],
          ["2027-03-10", "Present"],
        ])),
        noEvents(),
      ),
    ];
  },
});
