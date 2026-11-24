// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Repeating a call under its
// request key answers what it answered the first time, which is how a later step finds an earlier record again.
// HRMS's validate_request_overlap: no two draft or approved attendance requests of an employee share a day; a rejected
// one doesn't count (decisions/CX-leave.md, call 6). HRMS's should_mark_attendance: an approved request skips every day
// an approved leave covers, and an open leave doesn't stop it.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceRequestOverlaps } from "../blueprint/things/attendance-request/errors.ts";
import { AttendanceRequestApproved } from "../blueprint/things/attendance-request/events.ts";
import { machine as requests } from "../blueprint/things/attendance-request/machine.ts";
import create from "../blueprint/things/attendance-request/verbs/create.ts";
import approveRequest from "../blueprint/things/attendance-request/verbs/approve.ts";
import rejectRequest from "../blueprint/things/attendance-request/verbs/reject.ts";
import approveLeave from "../blueprint/things/leave-application/verbs/approve.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";

type Item = { readonly attendanceDate: string; readonly status: string };
const within = (p: { readonly items: ReadonlyArray<Item> }, from: string, to: string) =>
  [...p.items].filter((i) => i.attendanceDate >= from && i.attendanceDate <= to)
    .sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.attendanceDate, i.status]);
const WFH = "Work From Home";

export default Blueprint.journey("attendance requests and leave", {
  // Olga works at Acme Trading, which Ada runs, has 10 days of Annual Leave for 2027, and has asked for Monday 1 to
  // Wednesday 3 March 2027 off; it is open. Bo is signed in; Ada hires him partway.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave application",
  steps: (s) => {
    const ask = (fromDate: string, toDate: string, request: string, reason: string = WFH) =>
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate, toDate, reason: reason as never }, { request });
    return [
      s.step("Olga asks to work from home Monday 8 to Wednesday 10 March", ask("2027-03-08", "2027-03-10", "a"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step("she can't ask for 10 to 11 March too: it shares the 10th", ask("2027-03-10", "2027-03-11", "b"), refuses(AttendanceRequestOverlaps), noEvents()),
      s.step("nor for 5 to 8 March, sharing the 8th", ask("2027-03-05", "2027-03-08", "c"), refuses(AttendanceRequestOverlaps), noEvents()),
      s.step("nor On Duty on the 9th, inside it", ask("2027-03-09", "2027-03-09", "d", "On Duty"), refuses(AttendanceRequestOverlaps), noEvents()),
      s.step("nor 1 to 31 March, around it", ask("2027-03-01", "2027-03-31", "e"), refuses(AttendanceRequestOverlaps), noEvents()),
      s.step("11 to 12 March is allowed, from the day after", ask("2027-03-11", "2027-03-12", "f"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step("Ada rejects it", s.ada.run(rejectRequest, { attendanceRequest: s.last.attendanceRequest }), requests.isIn(s.last.attendanceRequest, "rejected")),
      s.step("12 March alone is allowed now: a rejected request doesn't overlap", ask("2027-03-12", "2027-03-12", "g", "On Duty"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step("Olga sends 8 to 10 March again, and gets it back", ask("2027-03-08", "2027-03-10", "a"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step("Ada approves it", s.ada.run(approveRequest, { attendanceRequest: s.last.attendanceRequest }), requests.isIn(s.last.attendanceRequest, "approved")),
      s.step("Olga can't ask for the 9th again: an approved request overlaps", ask("2027-03-09", "2027-03-09", "h"), refuses(AttendanceRequestOverlaps), noEvents()),
      s.step(
        "Ada hires Bo",
        s.ada.run(hire, {
          company: s.world.company, person: s.bo.person, firstName: "Bo Mwangi", gender: "Male", dateOfBirth: "1990-07-01", dateOfJoining: "2026-02-01",
          department: s.world.department, designation: s.world.designation,
        }),
        expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
      ),
      s.step(
        "Bo asks to work from home on the 9th: Olga's request isn't his",
        s.bo.run(create, { company: s.world.company, employee: s.last.employee, fromDate: "2027-03-09", toDate: "2027-03-09", reason: WFH }),
        requests.isIn(s.last.attendanceRequest, "draft"),
      ),
      // An approved request skips the days an approved leave covers.
      s.step(
        "Olga asks to work from home Friday 26 February to Thursday 4 March, around her open leave",
        ask("2027-02-26", "2027-03-04", "around"),
        requests.isIn(s.last.attendanceRequest, "draft"),
      ),
      s.step(
        "Ada approves her leave, 1 to 3 March",
        s.ada.run(approveLeave, { leaveApplication: s.world.leaveApplication }),
        expect((a) => [a.marked, a.changed]).toEqual([3n, 0n]),
      ),
      s.step("Olga sends the request around it again, and gets it back", ask("2027-02-26", "2027-03-04", "around"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step(
        "Ada approves the request: it marks the four days around the leave and leaves the leave's days On Leave",
        s.ada.run(approveRequest, { attendanceRequest: s.last.attendanceRequest }),
        expect((a) => [a.marked, a.changed]).toEqual([4n, 0n]),
        emits(AttendanceRequestApproved, { marked: 4n, changed: 0n }),
      ),
      s.step(
        "Olga's days read as both left them",
        s.olga.run(list, { employee: s.world.employee }),
        expect((p) => within(p, "2027-02-01", "2027-03-31")).toEqual([
          ["2027-02-26", WFH], ["2027-02-27", WFH], ["2027-02-28", WFH],
          ["2027-03-01", "On Leave"], ["2027-03-02", "On Leave"], ["2027-03-03", "On Leave"], ["2027-03-04", WFH],
          ["2027-03-08", WFH], ["2027-03-09", WFH], ["2027-03-10", WFH],
        ]),
        noEvents(),
      ),
      // An open leave doesn't stop a request marking its days.
      s.step(
        "Olga asks for leave on Monday 15 March, and it stays open",
        s.olga.run(apply, { company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType, fromDate: "2027-03-15", toDate: "2027-03-15", reason: "Rest" }),
        expect((a) => a.leaveApplication).toMatch(/^lap_[0-9a-z]+$/),
      ),
      s.step("she asks to work from home on the 15th", ask("2027-03-15", "2027-03-15", "open-leave"), requests.isIn(s.last.attendanceRequest, "draft")),
      s.step(
        "Ada approves it: the open leave doesn't stop it",
        s.ada.run(approveRequest, { attendanceRequest: s.last.attendanceRequest }),
        expect((a) => [a.marked, a.changed]).toEqual([1n, 0n]),
      ),
    ];
  },
});
