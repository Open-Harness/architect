// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Repeating a call under its
// request key answers what it answered the first time, which is how a later step finds an earlier record again.
// Which days a leave takes (decisions/CX-leave.md): the days from its first to its last, both counted, less the
// holidays among them unless its type counts holidays (HRMS's get_number_of_leave_days). A holiday is a day one of the
// company's own holiday lists holds (call 1); another company's lists don't count. A leave of holidays alone is refused
// (validate_balance_leaves), and so are an end before its start (validate_dates), a day before joining (Capxul's own,
// call 7) and a day the employee is marked Present or Work From Home (validate_attendance, on create and on approve).
// Approve marks every leave day On Leave and skips the holidays (update_attendance); mark refuses any day of an approved
// leave, holidays included (call 5).
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  LeaveAllHolidays,
  LeaveBeforeJoining,
  LeaveDayAttended,
  LeaveEndsBeforeStart,
  LeaveTooLong,
} from "../blueprint/things/leave-application/errors.ts";
import { AttendanceOnLeave } from "../blueprint/things/attendance/errors.ts";
import { LeaveApplicationApproved } from "../blueprint/things/leave-application/events.ts";
import { machine as applications } from "../blueprint/things/leave-application/machine.ts";
import apply from "../blueprint/things/leave-application/verbs/create.ts";
import approve from "../blueprint/things/leave-application/verbs/approve.ts";
import addType from "../blueprint/things/leave-type/verbs/create.ts";
import allocate from "../blueprint/things/leave-allocation/verbs/create.ts";
import submit from "../blueprint/things/leave-allocation/verbs/submit.ts";
import createList from "../blueprint/things/holiday-list/verbs/create.ts";
import addHoliday from "../blueprint/things/holiday/verbs/add.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import { days, daysOf } from "../blueprint/values/leave-journeys.ts";

type Item = { readonly attendanceDate: string; readonly status: string };
/** The employee's attendances in a range, as [day, status], by day. */
const within = (p: { readonly items: ReadonlyArray<Item> }, from: string, to: string) =>
  [...p.items].filter((i) => i.attendanceDate >= from && i.attendanceDate <= to)
    .sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.attendanceDate, i.status]);

export default Blueprint.journey("leave days", {
  // Olga works at Acme Trading, which Ada runs, joined on 5 January 2026, and has 10 days of Annual Leave for 2027 (at
  // most 5 in a row, holidays not counted). Bo is signed in and sets up Bo Ltd.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave allocation",
  steps: (s) => {
    const ask = (fromDate: string, toDate: string, request: string, leaveType: unknown = s.world.leaveType) =>
      s.olga.run(apply, { company: s.world.company, employee: s.world.employee, leaveType: leaveType as never, fromDate, toDate, reason: "Rest" }, { request });
    const kenya = () =>
      s.ada.run(createList, { company: s.world.company, holidayListName: "KE-27", fromDate: "2027-01-01", toDate: "2027-12-31" }, { request: "kenya" });
    const holiday = (holidayDate: string, description: string) => s.ada.run(addHoliday, { holidayList: s.last.holidayList, holidayDate, description });
    const markAs = (attendanceDate: string, status: string) =>
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate, status: status as never });
    const sick = () =>
      s.ada.run(addType, { company: s.world.company, leaveTypeName: "SICK-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: true }, { request: "sick" });
    const unpaid = () =>
      s.ada.run(addType, { company: s.world.company, leaveTypeName: "UNPAID-LV", maxContinuousDaysAllowed: 0n, isLwp: true, includeHoliday: false }, { request: "unpaid" });
    return [
      s.step("Ada starts Kenya 2027, a holiday list for the year", kenya(), expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/)),
      s.step("and makes Friday 5 March a holiday", holiday("2027-03-05", "Founders' Day"), expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/)),
      s.step(
        "Olga asks for Monday 1 to Friday 5 March: four days, the holiday not counted",
        ask("2027-03-01", "2027-03-05", "march"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("4"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Ada approves it: the four days are marked, the holiday isn't",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        expect((a) => [a.marked, a.changed]).toEqual([4n, 0n]),
        emits(LeaveApplicationApproved, { marked: 4n, changed: 0n }),
      ),
      s.step(
        "Olga's March reads On Leave from Monday to Thursday, and nothing on the Friday",
        s.olga.run(list, { employee: s.world.employee }),
        expect((p) => within(p, "2027-02-01", "2027-03-31")).toEqual([
          ["2027-03-01", "On Leave"], ["2027-03-02", "On Leave"], ["2027-03-03", "On Leave"], ["2027-03-04", "On Leave"],
        ]),
      ),
      s.step("Olga sends her March leave again, and gets it back", ask("2027-03-01", "2027-03-05", "march"), applications.isIn(s.last.leaveApplication, "approved")),
      s.step(
        "Ada can't mark Olga on the holiday inside it: the approved leave covers it",
        markAs("2027-03-05", "Present"),
        refuses(AttendanceOnLeave, { leaveApplication: s.last.leaveApplication }),
        noEvents(),
      ),
      s.step("Ada looks up Kenya 2027", kenya(), expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/)),
      s.step("and makes Friday 2 April a holiday", holiday("2027-04-02", "Good Friday"), expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/)),
      s.step("Olga can't take Friday 2 April alone: it takes no day", ask("2027-04-02", "2027-04-02", "good-friday"), refuses(LeaveAllHolidays), noEvents()),
      s.step("Ada looks up Kenya 2027 again", kenya(), expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/)),
      s.step("and makes Saturday 10 April a holiday", holiday("2027-04-10", "Rest day"), expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/)),
      s.step("Ada looks up Kenya 2027 a third time", kenya(), expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/)),
      s.step("and makes Sunday 11 April a holiday", holiday("2027-04-11", "Rest day"), expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/)),
      s.step(
        "Thursday 8 to Tuesday 13 April takes four days: two of its six are holidays, so it isn't too long",
        ask("2027-04-08", "2027-04-13", "april"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("4"),
      ),
      s.step(
        "Thursday 15 to Tuesday 20 April, six days with no holiday, is too long",
        ask("2027-04-15", "2027-04-20", "too-long"),
        refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }),
        noEvents(),
      ),
      s.step("Ada adds Sick Leave, holidays counted", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "and gives Olga 3 days of it for 2027",
        s.ada.run(allocate, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-12-31", newLeavesAllocated: days("3"),
        }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
      ),
      s.step("and submits it", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/)),
      s.step("Ada looks up Sick Leave", sick(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Olga takes Sick Leave on Good Friday: it counts the holiday",
        ask("2027-04-02", "2027-04-02", "sick-good-friday", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
      ),
      s.step(
        "Ada approves it, and it marks Good Friday",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        expect((a) => [a.marked, a.changed]).toEqual([1n, 0n]),
      ),
      // A holiday is a day one of the company's lists holds; each list holds only days in its range.
      s.step(
        "Ada starts a second list, Coast June, for June 2027 alone",
        s.ada.run(createList, { company: s.world.company, holidayListName: "COAST-06", fromDate: "2027-06-01", toDate: "2027-06-30" }),
        expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/),
      ),
      s.step("and makes Monday 14 June a holiday in it", holiday("2027-06-14", "Coast Day"), expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/)),
      s.step(
        "Olga's Monday 14 to Wednesday 16 June takes two days: either list's holiday counts",
        ask("2027-06-14", "2027-06-16", "june"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("2"),
      ),
      s.step("Bo sets up Bo Ltd", s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Tanzania", defaultCurrency: "TZS" }), expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/)),
      s.step(
        "and starts its list for 2027",
        s.bo.run(createList, { company: s.last.company, holidayListName: "BO-27", fromDate: "2027-01-01", toDate: "2027-12-31" }),
        expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/),
      ),
      s.step(
        "and makes Monday 3 May a holiday in it",
        s.bo.run(addHoliday, { holidayList: s.last.holidayList, holidayDate: "2027-05-03", description: "Bo's Day" }),
        expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/),
      ),
      s.step(
        "Olga's Monday 3 May takes a day: Bo Ltd's holiday isn't Acme Trading's",
        ask("2027-05-03", "2027-05-03", "may"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
      ),
      // Dates.
      s.step("a leave ending the day before it starts is refused", ask("2027-05-11", "2027-05-10", "backwards"), refuses(LeaveEndsBeforeStart, { fromDate: "2027-05-11" }), noEvents()),
      s.step("so is one ending the day before it starts, across a year's end", ask("2028-01-01", "2027-12-31", "backwards-year"), refuses(LeaveEndsBeforeStart, { fromDate: "2028-01-01" }), noEvents()),
      s.step(
        "a leave from 2 to 6 January 2026, starting before Olga joined, is refused",
        ask("2026-01-02", "2026-01-06", "before-joining"),
        refuses(LeaveBeforeJoining, { dateOfJoining: "2026-01-05" }),
        noEvents(),
      ),
      s.step("so is one on the day before, alone", ask("2026-01-04", "2026-01-04", "day-before"), refuses(LeaveBeforeJoining, { dateOfJoining: "2026-01-05" }), noEvents()),
      s.step("one ending before it starts, before she joined, is refused for its dates first", ask("2026-01-04", "2026-01-03", "both"), refuses(LeaveEndsBeforeStart, { fromDate: "2026-01-04" }), noEvents()),
      s.step("Ada adds Leave Without Pay", unpaid(), expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/)),
      s.step(
        "Olga takes it on the day she joined, Monday 5 January 2026",
        ask("2026-01-05", "2026-01-05", "joining-day", s.last.leaveType),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("1"),
      ),
      // Days she was at work.
      s.step("Ada marks Olga present on Monday 5 July 2027", markAs("2027-07-05", "Present"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step(
        "5 to 10 July is refused as too long before the day she was at work",
        ask("2027-07-05", "2027-07-10", "jul-5-long"),
        refuses(LeaveTooLong, { maxContinuousDaysAllowed: 5n }),
        noEvents(),
      ),
      s.step("Olga can't take 5 to 6 July: she was at work on the 5th", ask("2027-07-05", "2027-07-06", "jul-5"), refuses(LeaveDayAttended, { attendanceDate: "2027-07-05" }), noEvents()),
      s.step("Ada marks her working from home on Tuesday 6 July", markAs("2027-07-06", "Work From Home"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step("Ada marks her present on Thursday 8 July", markAs("2027-07-08", "Present"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step(
        "Olga can't take Tuesday 6 to Thursday 8 July: the first day she was at work is the 6th",
        ask("2027-07-06", "2027-07-08", "jul-6"),
        refuses(LeaveDayAttended, { attendanceDate: "2027-07-06" }),
        noEvents(),
      ),
      s.step("Ada marks her absent on Monday 12 July", markAs("2027-07-12", "Absent"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step("and on a half day on Tuesday 13 July", markAs("2027-07-13", "Half Day"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step(
        "Olga can take 12 to 14 July: absent and half days aren't days at work",
        ask("2027-07-12", "2027-07-14", "jul-12"),
        expect((a) => daysOf(a.totalLeaveDays)).toEqual("3"),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step("Ada marks her present on Wednesday 14 July, while the leave is open", markAs("2027-07-14", "Present"), expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/)),
      s.step("Olga sends 12 to 14 July again, and gets it back", ask("2027-07-12", "2027-07-14", "jul-12"), applications.isIn(s.last.leaveApplication, "open")),
      s.step(
        "Ada can't approve it now: Olga was at work on the 14th",
        s.ada.run(approve, { leaveApplication: s.last.leaveApplication }),
        refuses(LeaveDayAttended, { attendanceDate: "2027-07-14" }),
        noEvents(),
        applications.isIn(s.last.leaveApplication, "open"),
      ),
      s.step(
        "Olga's July reads as Ada marked it",
        s.olga.run(list, { employee: s.world.employee }),
        expect((p) => within(p, "2027-07-01", "2027-07-31")).toEqual([
          ["2027-07-05", "Present"], ["2027-07-06", "Work From Home"], ["2027-07-08", "Present"],
          ["2027-07-12", "Absent"], ["2027-07-13", "Half Day"], ["2027-07-14", "Present"],
        ]),
      ),
    ];
  },
});
