// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Olga joined Acme Trading on Monday 5 January 2026 (`an employee`).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceMarked } from "../blueprint/things/attendance/events.ts";
import { AttendanceAlreadyMarked, AttendanceBeforeJoining } from "../blueprint/things/attendance/errors.ts";
import { machine as attendances } from "../blueprint/things/attendance/machine.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import get from "../blueprint/things/attendance/verbs/get.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";

type Item = { readonly id: string; readonly company: string; readonly employee: string; readonly attendanceDate: string; readonly status: string; readonly state: string };
/** A page's items as [day, status, company, employee, state], by day: the order a handler marks them in is its own. */
const rows = (p: { readonly items: ReadonlyArray<Item> }) =>
  [...p.items].sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.attendanceDate, i.status, i.company, i.employee, i.state]);

export default Blueprint.journey("mark attendance", {
  // Ada runs Acme Trading and employs Olga; Bo is signed in, and is hired later.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an employee",
  steps: (s) => [
    s.step(
      "Ada marks Olga present on Monday 2 November",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-02", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2026-11-02", status: "Present" }),
      attendances.isIn(s.last.attendance, "marked"),
      spans({ present: ["attendance.mark", "attendance.mark.load", "attendance.mark.insert"] }),
    ),
    s.step(
      "Olga reads it back",
      s.olga.run(get, { id: s.last.attendance }),
      expect((a) => [a.company, a.employee, a.attendanceDate, a.status, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-02",
        "Present",
        "marked",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada marks her absent on the Tuesday",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-03", status: "Absent" }),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2026-11-03", status: "Absent" }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.attendance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back absent",
      s.ada.run(get, { id: s.last.attendance }),
      expect((a) => [a.company, a.employee, a.attendanceDate, a.status, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-03",
        "Absent",
        "marked",
      ]),
      noEvents(),
    ),
    s.step(
      "a half day on the Wednesday",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-04", status: "Half Day" }),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2026-11-04", status: "Half Day" }),
    ),
    s.step(
      "it reads back a half day",
      s.olga.run(get, { id: s.last.attendance }),
      expect((a) => [a.attendanceDate, a.status]).toEqual(["2026-11-04", "Half Day"]),
      noEvents(),
    ),
    s.step(
      "working from home on the Thursday",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-05", status: "Work From Home" }),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2026-11-05", status: "Work From Home" }),
    ),
    s.step(
      "it reads back working from home",
      s.olga.run(get, { id: s.last.attendance }),
      expect((a) => [a.attendanceDate, a.status]).toEqual(["2026-11-05", "Work From Home"]),
      noEvents(),
    ),
    s.step(
      "2 November can't be marked again, even with another status",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-02", status: "Absent" }),
      refuses(AttendanceAlreadyMarked, { attendanceDate: "2026-11-02" }),
      noEvents(),
    ),
    s.step(
      "the day before Olga joined can't be marked",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-01-04", status: "Present" }),
      refuses(AttendanceBeforeJoining, { dateOfJoining: "2026-01-05" }),
      noEvents(),
      spans({ absent: ["attendance.mark.insert"] }),
    ),
    s.step(
      "nor the last day of the year before",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2025-12-31", status: "Present" }),
      refuses(AttendanceBeforeJoining, { dateOfJoining: "2026-01-05" }),
      noEvents(),
    ),
    s.step(
      "nor a day in the year before that falls later in its month",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2025-02-10", status: "Present" }),
      refuses(AttendanceBeforeJoining, { dateOfJoining: "2026-01-05" }),
      noEvents(),
    ),
    s.step(
      "the day she joined can",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-01-05", status: "Present" }),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2026-01-05", status: "Present" }),
    ),
    s.step(
      "and so can a day still to come: HRMS has no check on it at 46b38904",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2027-03-01", status: "Absent" }),
      emits(AttendanceMarked, { attendance: s.last.attendance, employee: s.world.employee, attendanceDate: "2027-03-01", status: "Absent" }),
    ),
    s.step(
      "Olga can't mark herself",
      s.olga.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-06", status: "Present" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["attendance.mark", "attendance.mark.insert"] }),
    ),
    s.step(
      "Bo can't mark her",
      s.bo.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-06", status: "Present" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Olga's attendances list every day marked, each as it was marked",
      s.olga.run(list, { employee: s.world.employee }),
      expect((p) => rows(p)).toEqual(
        [
          ["2026-01-05", "Present"],
          ["2026-11-02", "Present"],
          ["2026-11-03", "Absent"],
          ["2026-11-04", "Half Day"],
          ["2026-11-05", "Work From Home"],
          ["2027-03-01", "Absent"],
        ].map((d) => [...d, s.world.company, s.world.employee, "marked"]),
      ),
      noEvents(),
    ),
    s.step(
      "Bo can't list them",
      s.bo.run(list, { employee: s.world.employee }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada hires Bo, joining on 1 February",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.bo.person,
        firstName: "Bo Mwangi",
        gender: "Male",
        dateOfBirth: "1990-07-01",
        dateOfJoining: "2026-02-01",
        department: s.world.department,
        designation: s.world.designation,
      }),
      expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't be marked on a day Olga had joined but he hadn't",
      s.ada.run(mark, { company: s.world.company, employee: s.last.employee, attendanceDate: "2026-01-20", status: "Present" }),
      refuses(AttendanceBeforeJoining, { dateOfJoining: "2026-02-01" }),
      noEvents(),
    ),
    s.step(
      "Bo is marked on a day Olga was marked too: the rule is one a day for each employee",
      s.ada.run(mark, { company: s.world.company, employee: s.last.employee, attendanceDate: "2026-11-02", status: "Absent" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "Olga can't read Bo's",
      s.olga.run(get, { id: s.last.attendance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads his own, absent on 2 November",
      s.bo.run(get, { id: s.last.attendance }),
      // Bo reads it as its employee (self), so it is his, not Olga's.
      expect((a) => [a.company, a.attendanceDate, a.status, a.state]).toEqual([s.world.company, "2026-11-02", "Absent", "marked"]),
      noEvents(),
    ),
    s.step(
      "Olga's 2 November is still present, and hers alone",
      s.ada.run(list, { employee: s.world.employee, attendanceDate: "2026-11-02" }),
      expect((p) => p.items.map((i: Item) => [i.employee, i.attendanceDate, i.status])).toEqual([[s.world.employee, "2026-11-02", "Present"]]),
      noEvents(),
    ),
  ],
});
