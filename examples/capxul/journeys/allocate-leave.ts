// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Leave Allocation (decisions/CX-leave.md): a draft, then submitted. Leaves allocated is an exact decimal. An
// allocation is refused when it ends before it starts (validate_period), when a submitted one of the same employee and
// type shares a day with it (validate_allocation_overlap, on create and on submit), for leave without pay
// (validate_lwp), for no leaves (set_total_leaves_allocated) and for more leaves than its days
// (validate_total_leaves_allocated).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  AllocationEndsBeforeStart,
  AllocationExceedsPeriod,
  AllocationOverlaps,
  LeaveWithoutPayNotAllocated,
  NoLeavesAllocated,
} from "../blueprint/things/leave-allocation/errors.ts";
import { LeaveAllocationCreated, LeaveAllocationSubmitted } from "../blueprint/things/leave-allocation/events.ts";
import { machine as allocations } from "../blueprint/things/leave-allocation/machine.ts";
import create from "../blueprint/things/leave-allocation/verbs/create.ts";
import submit from "../blueprint/things/leave-allocation/verbs/submit.ts";
import get from "../blueprint/things/leave-allocation/verbs/get.ts";
import addType from "../blueprint/things/leave-type/verbs/create.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import { days, daysOf } from "../blueprint/values/leave-journeys.ts";

type Allocation = { company: string; employee: string; leaveType: string; fromDate: string; toDate: string; newLeavesAllocated: unknown; state: string };
const read = (a: Allocation) => [a.company, a.employee, a.leaveType, a.fromDate, a.toDate, daysOf(a.newLeavesAllocated), a.state];

export default Blueprint.journey("allocate leave", {
  // Olga works at Acme Trading, which Ada runs; Annual Leave is its type. Bo is signed in, and Ada hires him partway.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a leave type",
  steps: (s) => {
    /** Ada gives Olga Annual Leave from one day to another. */
    const annual = (fromDate: string, toDate: string, leaves: string, request?: string) =>
      s.ada.run(
        create,
        { company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType, fromDate, toDate, newLeavesAllocated: days(leaves) },
        ...(request === undefined ? [] : [{ request }]),
      );
    return [
      s.step(
        "Ada gives Olga ten and a half days of Annual Leave for the first half of 2027",
        annual("2027-01-01", "2027-06-30", "10.5"),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
        emits(LeaveAllocationCreated, { company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType }),
        allocations.isIn(s.last.leaveAllocation, "draft"),
        spans({ present: ["leave-allocation.create", "leave-allocation.create.load", "leave-allocation.create.insert"] }),
      ),
      s.step(
        "Olga can't submit it",
        s.olga.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "Ada submits it",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
        emits(LeaveAllocationSubmitted, {}),
        allocations.isIn(s.last.leaveAllocation, "submitted"),
        spans({ present: ["leave-allocation.submit", "leave-allocation.submit.load", "leave-allocation.submit.update"] }),
      ),
      s.step(
        "it can't be submitted twice",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        refuses(allocations.notFrom, { state: "submitted" }),
        noEvents(),
      ),
      s.step(
        "Bo can't read it",
        s.bo.run(get, { id: s.last.leaveAllocation }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "Olga reads it back, as Ada typed it, with its half day",
        s.olga.run(get, { id: s.last.leaveAllocation }),
        expect((a) => read(a)).toEqual([s.world.company, s.world.employee, s.world.leaveType, "2027-01-01", "2027-06-30", "10.5", "submitted"]),
        noEvents(),
      ),
      s.step(
        "nor give Olga leave in Acme Trading",
        s.bo.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.world.leaveType, fromDate: "2027-07-01", toDate: "2027-12-31", newLeavesAllocated: days("1"),
        }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["leave-allocation.create", "leave-allocation.create.load"] }),
      ),
      // validate_allocation_overlap: to_date >= from and from_date <= to, against submitted allocations.
      s.step("an allocation sharing its last day is refused", annual("2027-06-30", "2027-07-31", "1"), refuses(AllocationOverlaps), noEvents(), spans({ absent: ["leave-allocation.create.insert"] })),
      s.step("so is one sharing its first day", annual("2026-12-01", "2027-01-01", "1"), refuses(AllocationOverlaps), noEvents()),
      s.step("and one around it", annual("2026-12-01", "2027-12-31", "1"), refuses(AllocationOverlaps), noEvents()),
      s.step("and one inside it", annual("2027-03-01", "2027-03-31", "1"), refuses(AllocationOverlaps), noEvents()),
      s.step(
        "the second half of 2027, from the day after, is allowed",
        annual("2027-07-01", "2027-12-31", "5"),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "and submitted",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        allocations.isIn(s.last.leaveAllocation, "submitted"),
      ),
      s.step(
        "so is the second half of 2026, ending the day before",
        annual("2026-07-01", "2026-12-31", "5"),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
      ),
      s.step("and submitted, again", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), allocations.isIn(s.last.leaveAllocation, "submitted")),
      s.step(
        "Ada adds Sick Leave",
        s.ada.run(addType, { company: s.world.company, leaveTypeName: "SICK-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: true }),
        expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
      ),
      s.step(
        "and gives Olga Sick Leave over the same days as her first Annual Leave",
        s.ada.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-06-30", newLeavesAllocated: days("7"),
        }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
        emits(LeaveAllocationCreated, { employee: s.world.employee }),
      ),
      s.step(
        "which is submitted too: another type doesn't overlap",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        allocations.isIn(s.last.leaveAllocation, "submitted"),
      ),
      s.step(
        "it reads back as Sick Leave",
        s.ada.run(get, { id: s.last.leaveAllocation }),
        expect((a) => [a.fromDate, a.toDate, daysOf(a.newLeavesAllocated), a.leaveType === s.world.leaveType, a.state]).toEqual([
          "2027-01-01", "2027-06-30", "7", false, "submitted",
        ]),
      ),
      // Two drafts may overlap; once one is submitted, the other can't be.
      s.step(
        "Ada drafts Annual Leave for the first half of 2028",
        annual("2028-01-01", "2028-06-30", "3", "draft-2028-first-half"),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "and drafts one from March to December 2028 too: drafts don't overlap",
        annual("2028-03-01", "2028-12-31", "3"),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step("she submits the March one", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), allocations.isIn(s.last.leaveAllocation, "submitted")),
      s.step("one for October 2028, inside it, is refused", annual("2028-10-01", "2028-10-31", "1"), refuses(AllocationOverlaps), noEvents()),
      s.step(
        "one for January and February 2028 is allowed, ending the day before it",
        annual("2028-01-01", "2028-02-29", "2"),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "and submitted: 2028 is a leap year, so 29 February is the day before",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        allocations.isIn(s.last.leaveAllocation, "submitted"),
      ),
      s.step(
        "Ada sends the first-half draft again under its request key, and gets the same draft back",
        annual("2028-01-01", "2028-06-30", "3", "draft-2028-first-half"),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "it can't be submitted now: it shares days with the two submitted since",
        s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
        refuses(AllocationOverlaps),
        noEvents(),
        allocations.isIn(s.last.leaveAllocation, "draft"),
        spans({ absent: ["leave-allocation.submit.update"] }),
      ),
      s.step(
        "Ada hires Bo too",
        s.ada.run(hire, {
          company: s.world.company, person: s.bo.person, firstName: "Bo Mwangi", gender: "Male", dateOfBirth: "1990-07-01", dateOfJoining: "2026-02-01",
          department: s.world.department, designation: s.world.designation,
        }),
        expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
      ),
      s.step(
        "and gives him Annual Leave on Olga's days: another employee doesn't overlap",
        s.ada.run(create, {
          company: s.world.company, employee: s.last.employee, leaveType: s.world.leaveType, fromDate: "2027-01-01", toDate: "2027-06-30", newLeavesAllocated: days("4"),
        }),
        expect((a) => a.leaveAllocation).toMatch(/^lal_[0-9a-z]+$/),
      ),
      s.step("and submits it", s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }), allocations.isIn(s.last.leaveAllocation, "submitted")),
      // validate_period: an end before the start; the same day is allowed.
      s.step(
        "an allocation ending the day before it starts, across a year's end, is refused",
        annual("2030-01-01", "2029-12-31", "1"),
        refuses(AllocationEndsBeforeStart, { fromDate: "2030-01-01" }),
        noEvents(),
        spans({ absent: ["leave-allocation.create.insert"] }),
      ),
      s.step("so is one ending the day before it starts inside a month", annual("2029-03-05", "2029-03-04", "1"), refuses(AllocationEndsBeforeStart, { fromDate: "2029-03-05" }), noEvents()),
      s.step(
        "one starting and ending on 5 March 2029, with one day, is allowed",
        annual("2029-03-05", "2029-03-05", "1"),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      // set_total_leaves_allocated and validate_total_leaves_allocated: more than none, at most a leave a day.
      s.step("no leaves are refused", annual("2029-04-01", "2029-04-30", "0"), refuses(NoLeavesAllocated), noEvents()),
      s.step("and fewer than none", annual("2029-04-01", "2029-04-30", "-1"), refuses(NoLeavesAllocated), noEvents()),
      s.step(
        "a quarter of a day is allowed",
        annual("2029-04-01", "2029-04-01", "0.25"),
        allocations.isIn(s.last.leaveAllocation, "draft"),
      ),
      s.step(
        "and reads back as a quarter",
        s.ada.run(get, { id: s.last.leaveAllocation }),
        expect((a) => [a.fromDate, a.toDate, daysOf(a.newLeavesAllocated)]).toEqual(["2029-04-01", "2029-04-01", "0.25"]),
      ),
      s.step("three days and a hundredth over three days are refused", annual("2029-05-01", "2029-05-03", "3.01"), refuses(AllocationExceedsPeriod), noEvents()),
      s.step("three days over three days are allowed", annual("2029-05-01", "2029-05-03", "3"), allocations.isIn(s.last.leaveAllocation, "draft")),
      s.step("five over the four days across a month's end are refused", annual("2029-05-30", "2029-06-02", "5"), refuses(AllocationExceedsPeriod), noEvents()),
      s.step("four over them are allowed", annual("2029-05-30", "2029-06-02", "4"), allocations.isIn(s.last.leaveAllocation, "draft")),
      s.step("three over 28 February to 1 March 2029, two days, are refused", annual("2029-02-28", "2029-03-01", "3"), refuses(AllocationExceedsPeriod), noEvents()),
      s.step(
        "a draft overlapping a submitted one, with no leaves, is refused for its overlap first",
        annual("2027-06-01", "2027-06-30", "0"),
        refuses(AllocationOverlaps),
        noEvents(),
      ),
      s.step(
        "Ada adds Leave Without Pay",
        s.ada.run(addType, { company: s.world.company, leaveTypeName: "UNPAID-LV", maxContinuousDaysAllowed: 0n, isLwp: true, includeHoliday: false }),
        expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
      ),
      s.step(
        "it can't be allocated",
        s.ada.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-12-31", newLeavesAllocated: days("5"),
        }),
        refuses(LeaveWithoutPayNotAllocated),
        noEvents(),
        spans({ absent: ["leave-allocation.create.insert"] }),
      ),
      s.step(
        "not even with no leaves, which it is refused for first",
        s.ada.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-12-31", newLeavesAllocated: days("0"),
        }),
        refuses(LeaveWithoutPayNotAllocated),
        noEvents(),
      ),
      s.step(
        "nor with an end before its start, which it is refused for first",
        s.ada.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-02", toDate: "2027-01-01", newLeavesAllocated: days("1"),
        }),
        refuses(AllocationEndsBeforeStart, { fromDate: "2027-01-02" }),
        noEvents(),
      ),
      s.step(
        "nor with more leaves than days",
        s.ada.run(create, {
          company: s.world.company, employee: s.world.employee, leaveType: s.last.leaveType, fromDate: "2027-01-01", toDate: "2027-01-02", newLeavesAllocated: days("9"),
        }),
        refuses(LeaveWithoutPayNotAllocated),
        noEvents(),
      ),
    ];
  },
});
