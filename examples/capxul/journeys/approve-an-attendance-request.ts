// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's create_attendance_records: an approved request marks every day from its first to its last, Work From Home
// for that reason and Present for On Duty. A day already marked with another status changes to it (`changed`); a day
// already marked with that status is left; the rest are new (`marked`). No two requests here share a day, since HRMS
// refuses overlapping requests (validate_request_overlap), a check that comes with a list (#764).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceAlreadyMarked } from "../blueprint/things/attendance/errors.ts";
import { AttendanceRequestApproved } from "../blueprint/things/attendance-request/events.ts";
import { machine as requests } from "../blueprint/things/attendance-request/machine.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import create from "../blueprint/things/attendance-request/verbs/create.ts";
import approve from "../blueprint/things/attendance-request/verbs/approve.ts";
import reject from "../blueprint/things/attendance-request/verbs/reject.ts";
import get from "../blueprint/things/attendance-request/verbs/get.ts";

type Item = { readonly id: string; readonly company: string; readonly employee: string; readonly attendanceDate: string; readonly status: string; readonly state: string };
/** A page's items as [day, status, company, employee, state], by day: the order a handler marks them in is its own. */
const rows = (p: { readonly items: ReadonlyArray<Item> }) =>
  [...p.items].sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.attendanceDate, i.status, i.company, i.employee, i.state]);
const WFH = "Work From Home";

export default Blueprint.journey("approve an attendance request", {
  // Olga works at Acme Trading, was marked absent on Tuesday 24 November, and has asked to work from home from Monday
  // 23 to Friday 27 November. Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an attendance request",
  steps: (s) => {
    /** Each [day, status] as one of Olga's attendances in Acme Trading. */
    const theirs = (want: ReadonlyArray<readonly [string, string]>) => want.map((d) => [...d, s.world.company, s.world.employee, "marked"]);
    return [
    s.step(
      "Ada marks Olga working from home on the Thursday already",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-26", status: WFH }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and present on the Sunday before the request",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-22", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and present on the Wednesday, in the office",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and absent on the Saturday after it",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-28", status: "Absent" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "Olga can't approve her own request",
      s.olga.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["attendance-request.approve", "attendance-request.approve.mark"] }),
    ),
    s.step(
      "nor can Bo",
      s.bo.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada approves it: two days are new, the absent Tuesday and the present Wednesday change, and Thursday is left as it was",
      s.ada.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      expect((a) => [a.attendanceRequest, a.marked, a.changed]).toEqual([s.world.attendanceRequest, 2n, 2n]),
      emits(AttendanceRequestApproved, { attendanceRequest: s.world.attendanceRequest, marked: 2n, changed: 2n }),
      requests.isIn(s.world.attendanceRequest, "approved"),
      spans({ present: ["attendance-request.approve", "attendance-request.approve.load", "attendance-request.approve.mark"] }),
    ),
    s.step(
      "Olga's week reads working from home each day of the request, and the days either side as they were",
      s.olga.run(list, { employee: s.world.employee }),
      expect((p) => rows(p)).toEqual(theirs([
        ["2026-11-22", "Present"],
        ["2026-11-23", WFH],
        ["2026-11-24", WFH],
        ["2026-11-25", WFH],
        ["2026-11-26", WFH],
        ["2026-11-27", WFH],
        ["2026-11-28", "Absent"],
      ])),
      // The Tuesday is the attendance Ada marked absent, changed, not a second one.
      expect((p) => p.items.filter((i: Item) => i.attendanceDate === "2026-11-24").map((i: Item) => i.id)).toEqual([s.world.attendance]),
      noEvents(),
    ),
    s.step(
      "Bo can't list them",
      s.bo.run(list, { employee: s.world.employee }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "the request reads back approved, as she asked it",
      s.olga.run(get, { id: s.world.attendanceRequest }),
      expect((a) => [a.company, a.employee, a.fromDate, a.toDate, a.reason, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-23",
        "2026-11-27",
        WFH,
        "approved",
      ]),
      noEvents(),
    ),
    s.step(
      "it can't be approved twice",
      s.ada.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      refuses(requests.notFrom, { state: "approved" }),
      noEvents(),
    ),
    s.step(
      "nor rejected once approved",
      s.ada.run(reject, { attendanceRequest: s.world.attendanceRequest }),
      refuses(requests.notFrom, { state: "approved" }),
      noEvents(),
    ),
    s.step(
      "a day it marked can't be marked again",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Absent" }),
      refuses(AttendanceAlreadyMarked, { attendanceDate: "2026-11-25" }),
      noEvents(),
    ),
    s.step(
      "Ada marks Olga absent on Monday 30 November",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-30", status: "Absent" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and present on Tuesday 1 December, in the office",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-12-01", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and a half day on Wednesday 2 December",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-12-02", status: "Half Day" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "Olga asks to be on duty from 30 November to 2 December, across the month's end",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-30", toDate: "2026-12-02", reason: "On Duty" }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, the absent Monday and the half day change to present, and the present Tuesday is left: none is new",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([0n, 2n]),
      emits(AttendanceRequestApproved, { attendanceRequest: s.last.attendanceRequest, marked: 0n, changed: 2n }),
    ),
    s.step(
      "Olga asks to work from home from Friday 4 to Sunday 6 December, across a weekend",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-12-04", toDate: "2026-12-06", reason: WFH }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, it marks all three, the Saturday and Sunday among them",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([3n, 0n]),
    ),
    s.step(
      "Olga asks to work from home on 7 December alone",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-12-07", toDate: "2026-12-07", reason: WFH }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, it marks that one day",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([1n, 0n]),
      emits(AttendanceRequestApproved, { attendanceRequest: s.last.attendanceRequest, marked: 1n, changed: 0n }),
    ),
    s.step(
      "Olga asks to work from home on New Year's Eve and New Year's Day",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-12-31", toDate: "2027-01-01", reason: WFH }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, it marks both, across the year's end",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([2n, 0n]),
    ),
    s.step(
      "Olga asks to work from home from 27 February to 1 March 2027, a year with no leap day",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2027-02-27", toDate: "2027-03-01", reason: WFH }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, it marks three days, with no 29 February",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([3n, 0n]),
    ),
    s.step(
      "Olga asks to be on duty from 28 February to 1 March 2028, a leap year",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2028-02-28", toDate: "2028-03-01", reason: "On Duty" }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "approved, it marks three days, 29 February among them",
      s.ada.run(approve, { attendanceRequest: s.last.attendanceRequest }),
      expect((a) => [a.marked, a.changed]).toEqual([3n, 0n]),
    ),
    s.step(
      "Ada finds 29 February present, in Acme Trading",
      s.ada.run(list, { employee: s.world.employee, attendanceDate: "2028-02-29" }),
      expect((p) => p.items.map((i: Item) => [i.company, i.employee, i.attendanceDate, i.status, i.state])).toEqual([
        [s.world.company, s.world.employee, "2028-02-29", "Present", "marked"],
      ]),
      noEvents(),
    ),
    s.step(
      "every day Olga was marked, each with the status its request or Ada gave it",
      s.olga.run(list, { employee: s.world.employee }),
      expect((p) => rows(p)).toEqual(theirs([
        ["2026-11-22", "Present"],
        ["2026-11-23", WFH],
        ["2026-11-24", WFH],
        ["2026-11-25", WFH],
        ["2026-11-26", WFH],
        ["2026-11-27", WFH],
        ["2026-11-28", "Absent"],
        ["2026-11-30", "Present"],
        ["2026-12-01", "Present"],
        ["2026-12-02", "Present"],
        ["2026-12-04", WFH],
        ["2026-12-05", WFH],
        ["2026-12-06", WFH],
        ["2026-12-07", WFH],
        ["2026-12-31", WFH],
        ["2027-01-01", WFH],
        ["2027-02-27", WFH],
        ["2027-02-28", WFH],
        ["2027-03-01", WFH],
        ["2028-02-28", "Present"],
        ["2028-02-29", "Present"],
        ["2028-03-01", "Present"],
      ])),
      noEvents(),
    ),
  ];
  },
});
