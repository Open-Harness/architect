// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Olga joined Acme Trading on Monday 5 January 2026 (`an employee`). The order of refusals is declared in
// blueprint/things/attendance-request/errors.ts; the steps that pin it say so.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceRequested } from "../blueprint/things/attendance-request/events.ts";
import { RequestBeforeJoining, RequestEndsBeforeStart } from "../blueprint/things/attendance-request/errors.ts";
import { machine as requests } from "../blueprint/things/attendance-request/machine.ts";
import create from "../blueprint/things/attendance-request/verbs/create.ts";
import get from "../blueprint/things/attendance-request/verbs/get.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";

export default Blueprint.journey("request attendance", {
  // Ada runs Acme Trading and employs Olga; Bo is signed in and has nothing to do with either.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an employee",
  steps: (s) => [
    s.step(
      "Olga asks to be marked working from home, 2 to 4 November",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-02", toDate: "2026-11-04", reason: "Work From Home" }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
      emits(AttendanceRequested, { attendanceRequest: s.last.attendanceRequest, company: s.world.company, employee: s.world.employee }),
      requests.isIn(s.last.attendanceRequest, "draft"),
      spans({ present: ["attendance-request.create", "attendance-request.create.load", "attendance-request.create.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.attendanceRequest }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "it reads back as she typed it, a draft",
      s.olga.run(get, { id: s.last.attendanceRequest }),
      expect((a) => [a.company, a.employee, a.fromDate, a.toDate, a.reason, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-02",
        "2026-11-04",
        "Work From Home",
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada asks for Olga on duty for the single day of 9 November",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-09", toDate: "2026-11-09", reason: "On Duty" }),
      emits(AttendanceRequested, { attendanceRequest: s.last.attendanceRequest, company: s.world.company, employee: s.world.employee }),
    ),
    s.step(
      "Ada reads it back on duty, a draft",
      s.ada.run(get, { id: s.last.attendanceRequest }),
      expect((a) => [a.company, a.employee, a.fromDate, a.toDate, a.reason, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-09",
        "2026-11-09",
        "On Duty",
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "a request can't end the day before it starts",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-10", toDate: "2026-11-09", reason: "On Duty" }),
      refuses(RequestEndsBeforeStart, { fromDate: "2026-11-10" }),
      noEvents(),
      spans({ absent: ["attendance-request.create.insert"] }),
    ),
    s.step(
      "nor in the month before",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-12-01", toDate: "2026-11-30", reason: "On Duty" }),
      refuses(RequestEndsBeforeStart, { fromDate: "2026-12-01" }),
      noEvents(),
    ),
    s.step(
      "nor in the year before, later in its month",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2027-01-01", toDate: "2026-12-31", reason: "Work From Home" }),
      refuses(RequestEndsBeforeStart, { fromDate: "2027-01-01" }),
      noEvents(),
    ),
    s.step(
      "a request can't start the day before Olga joined",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-01-04", toDate: "2026-01-06", reason: "On Duty" }),
      refuses(RequestBeforeJoining, { dateOfJoining: "2026-01-05" }),
      noEvents(),
      spans({ absent: ["attendance-request.create.insert"] }),
    ),
    s.step(
      "nor a year before, later in its month",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2025-03-01", toDate: "2026-01-06", reason: "On Duty" }),
      refuses(RequestBeforeJoining, { dateOfJoining: "2026-01-05" }),
      noEvents(),
    ),
    s.step(
      "one that ends before it starts and starts before she joined is refused for its order first",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-01-04", toDate: "2026-01-03", reason: "On Duty" }),
      // Order: RequestEndsBeforeStart before RequestBeforeJoining (HRMS's validate_dates).
      refuses(RequestEndsBeforeStart, { fromDate: "2026-01-04" }),
      noEvents(),
    ),
    s.step(
      "the day she joined may start one",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-01-05", toDate: "2026-01-06", reason: "On Duty" }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back from the day she joined",
      s.olga.run(get, { id: s.last.attendanceRequest }),
      expect((a) => [a.fromDate, a.toDate, a.reason, a.state]).toEqual(["2026-01-05", "2026-01-06", "On Duty", "draft"]),
      noEvents(),
    ),
    s.step(
      "days still to come may be asked for: HRMS's validate_dates runs with restrict_future_dates off",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2027-06-01", toDate: "2027-06-02", reason: "Work From Home" }),
      expect((a) => a.attendanceRequest).toMatch(/^arq_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't ask for Olga in Ada's company",
      s.bo.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-16", toDate: "2026-11-17", reason: "On Duty" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["attendance-request.create", "attendance-request.create.insert"] }),
    ),
    s.step(
      "a request in draft marks no day",
      s.olga.run(list, { employee: s.world.employee }),
      expect((p) => p.items.length).toBe(0),
      noEvents(),
    ),
  ],
});
