// What leave-application.create and .approve both read (decisions/CX-leave.md): a company's holidays, the allocation
// covering a leave and its balance, and the days an employee was at work. Every read is a `Records.list`, so the call's
// commit is refused when any of these lists changed under it (#764).
import { BigDecimal, Effect } from "effect";
import { Days } from "orthograph";
import { Records, type Instance } from "@orthograph/language-effect";
import { HolidayList } from "../../../blueprint/things/holiday-list/thing.ts";
import { Holiday } from "../../../blueprint/things/holiday/thing.ts";
import { LeaveAllocation } from "../../../blueprint/things/leave-allocation/thing.ts";
import { LeaveApplication } from "../../../blueprint/things/leave-application/thing.ts";
import { Attendance } from "../../../blueprint/things/attendance/thing.ts";

/** Every matching row counts as read at commit; the limit is set so the page holds them all. */
export const all = { state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

/** Every day from the first to the last, both counted. Days are YYYY-MM-DD, so they compare as text. */
export const daysFrom = (from: string, to: string): ReadonlyArray<string> =>
  Array.from({ length: Days.between(from, to) + 1 }, (_, k) => Days.add(from, k));

/** Do two ranges share a day? One's last day is on or after the other's first, and its first on or before the other's last. */
export const overlaps = (a: Instance, from: string, to: string) => (a["toDate"] as string) >= from && (a["fromDate"] as string) <= to;

/**
 * The days from `from` to `to` that are holidays: a day any of the company's own holiday lists holds, inside that list's
 * range (call 1). Another company's lists never count.
 */
export const holidaysOf = (company: string, from: string, to: string) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const lists = yield* records.list({ ...all, thing: HolidayList, where: { company } });
    const held = new Set<string>();
    for (const list of lists.items) {
      const holidays = yield* records.list({ ...all, thing: Holiday, where: { holidayList: list["id"] } });
      for (const holiday of holidays.items) {
        const day = holiday["holidayDate"] as string;
        if (day >= from && day <= to && day >= (list["fromDate"] as string) && day <= (list["toDate"] as string)) held.add(day);
      }
    }
    return held;
  });

/** The leave days from `from` to `to`: every day, less the holidays unless the type counts them (get_number_of_leave_days). */
export const leaveDaysOf = (leaveType: Instance, company: string, from: string, to: string) =>
  Effect.gen(function* () {
    const days = daysFrom(from, to);
    if (leaveType["includeHoliday"] === true) return days;
    const holidays = yield* holidaysOf(company, from, to);
    return days.filter((day) => !holidays.has(day));
  });

/** The one submitted allocation of the employee and type holding both the first and the last day (validate_dates_across_allocation). */
export const coveringAllocation = (employee: string, leaveType: string, from: string, to: string) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const allocations = yield* records.list({ ...all, thing: LeaveAllocation, where: { employee, leaveType }, state: "submitted" });
    return allocations.items.find((a) => (a["fromDate"] as string) <= from && to <= (a["toDate"] as string));
  });

/** What an allocation has left: its leaves allocated less the days of every approved application of its employee and type inside it. */
export const balanceOf = (allocation: Instance) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const approved = yield* records.list({
      ...all,
      thing: LeaveApplication,
      where: { employee: allocation["employee"], leaveType: allocation["leaveType"] },
      state: "approved",
    });
    const inside = approved.items.filter(
      (a) => (a["fromDate"] as string) >= (allocation["fromDate"] as string) && (a["toDate"] as string) <= (allocation["toDate"] as string),
    );
    const taken = BigDecimal.sumAll(inside.map((a) => a["totalLeaveDays"] as BigDecimal.BigDecimal));
    return BigDecimal.subtract(allocation["newLeavesAllocated"] as BigDecimal.BigDecimal, taken);
  });

/** The employee's attendances, by day. */
export const attendancesOf = (employee: string) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const marked = yield* records.list({ ...all, thing: Attendance, where: { employee } });
    return new Map(marked.items.map((a) => [a["attendanceDate"] as string, a] as const));
  });

/** The first day from `from` to `to` the employee is marked Present or Work From Home (validate_attendance), if any. */
export const firstDayAttended = (attendances: ReadonlyMap<string, Instance>, from: string, to: string) =>
  daysFrom(from, to).find((day) => {
    const status = attendances.get(day)?.["status"];
    return status === "Present" || status === "Work From Home";
  });
