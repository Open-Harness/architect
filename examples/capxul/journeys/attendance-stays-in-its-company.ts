// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The order of refusals is declared in the things' errors.ts; the steps that pin it say so. A leaver is refused a new
// attendance or request, but a request opened before they left can still be approved (AttendeeHasLeft's note).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendeeHasLeft, AttendeeNotInCompany } from "../blueprint/things/attendance/errors.ts";
import { RequesterHasLeft, RequesterNotInCompany } from "../blueprint/things/attendance-request/errors.ts";
import { AttendanceRequestApproved } from "../blueprint/things/attendance-request/events.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import create from "../blueprint/things/attendance-request/verbs/create.ts";
import approve from "../blueprint/things/attendance-request/verbs/approve.ts";

type Item = { readonly id: string; readonly company: string; readonly employee: string; readonly attendanceDate: string; readonly status: string };
const byDay = (p: { readonly items: ReadonlyArray<Item> }) =>
  [...p.items].sort((a, b) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i) => [i.company, i.employee, i.attendanceDate, i.status]);

export default Blueprint.journey("attendance stays in its company", {
  // Olga works at Acme Trading, was marked absent on 24 November and has asked to work from home 23 to 27 November;
  // Ada runs Acme Trading; Bo runs companies of his own.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an attendance request",
  steps: (s) => [
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't mark Olga in his company: she works for Ada",
      s.bo.run(mark, { company: s.last.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Present" }),
      refuses(AttendeeNotInCompany),
      noEvents(),
      spans({ absent: ["attendance.mark.insert"] }),
    ),
    s.step(
      "nor mark her absent there",
      s.bo.run(mark, { company: s.last.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Absent" }),
      refuses(AttendeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor mark her half day there",
      s.bo.run(mark, { company: s.last.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Half Day" }),
      refuses(AttendeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor mark her work from home there",
      s.bo.run(mark, { company: s.last.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Work From Home" }),
      refuses(AttendeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor ask for her attendance there",
      s.bo.run(create, { company: s.last.company, employee: s.world.employee, fromDate: "2026-11-30", toDate: "2026-11-30", reason: "On Duty" }),
      refuses(RequesterNotInCompany),
      noEvents(),
      spans({ absent: ["attendance-request.create.insert"] }),
    ),
    s.step(
      "Olga can't ask to work from home in Bo's company either",
      s.olga.run(create, { company: s.last.company, employee: s.world.employee, fromDate: "2026-11-30", toDate: "2026-11-30", reason: "Work From Home" }),
      refuses(RequesterNotInCompany),
      noEvents(),
    ),
    s.step(
      "Bo can't mark Olga in Ada's company",
      s.bo.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Present" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada relieves Olga on 30 November",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      expect((a) => a.relievingDate).toBe("2026-11-30"),
    ),
    s.step(
      "Bo sets up a second company",
      s.bo.run(createCompany, { companyName: "Bo Ventures", abbr: "BV", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't mark Olga in it now she has left",
      s.bo.run(mark, { company: s.last.company, employee: s.world.employee, attendanceDate: "2025-12-01", status: "Present" }),
      // Order: AttendeeNotInCompany before AttendeeHasLeft and AttendanceBeforeJoining.
      refuses(AttendeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "nor ask for her there, ending before it starts",
      s.bo.run(create, { company: s.last.company, employee: s.world.employee, fromDate: "2025-12-02", toDate: "2025-12-01", reason: "On Duty" }),
      // Order: RequesterNotInCompany before RequesterHasLeft and the dates.
      refuses(RequesterNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada can't mark Olga now she has left, even on a day she was at work",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Present" }),
      refuses(AttendeeHasLeft),
      noEvents(),
      spans({ absent: ["attendance.mark.insert"] }),
    ),
    s.step(
      "nor mark her absent now she has left",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Absent" }),
      refuses(AttendeeHasLeft),
      noEvents(),
    ),
    s.step(
      "nor mark her half day now she has left",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Half Day" }),
      refuses(AttendeeHasLeft),
      noEvents(),
    ),
    s.step(
      "nor mark her work from home now she has left",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Work From Home" }),
      refuses(AttendeeHasLeft),
      noEvents(),
    ),
    s.step(
      "nor on a day before she joined",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2025-12-01", status: "Present" }),
      // Order: AttendeeHasLeft before AttendanceBeforeJoining.
      refuses(AttendeeHasLeft),
      noEvents(),
    ),
    s.step(
      "Ada can't ask for Olga's attendance now she has left",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-30", toDate: "2026-11-30", reason: "On Duty" }),
      refuses(RequesterHasLeft),
      noEvents(),
      spans({ absent: ["attendance-request.create.insert"] }),
    ),
    s.step(
      "nor for days that end before they start, before she joined",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2025-12-02", toDate: "2025-12-01", reason: "On Duty" }),
      // Order: RequesterHasLeft before RequestEndsBeforeStart and RequestBeforeJoining.
      refuses(RequesterHasLeft),
      noEvents(),
    ),
    s.step(
      "Olga can't ask for herself either",
      s.olga.run(create, { company: s.world.company, employee: s.world.employee, fromDate: "2026-11-30", toDate: "2026-11-30", reason: "Work From Home" }),
      refuses(RequesterHasLeft),
      noEvents(),
    ),
    s.step(
      "the request she made before leaving is still approved, marking its days",
      s.ada.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      expect((a) => [a.attendanceRequest, a.marked, a.changed]).toEqual([s.world.attendanceRequest, 4n, 1n]),
      emits(AttendanceRequestApproved, { attendanceRequest: s.world.attendanceRequest, marked: 4n, changed: 1n }),
    ),
    s.step(
      "every day it marked is Olga's, in Ada's company",
      s.ada.run(list, { employee: s.world.employee }),
      expect((p) => byDay(p)).toEqual([
        [s.world.company, s.world.employee, "2026-11-23", "Work From Home"],
        [s.world.company, s.world.employee, "2026-11-24", "Work From Home"],
        [s.world.company, s.world.employee, "2026-11-25", "Work From Home"],
        [s.world.company, s.world.employee, "2026-11-26", "Work From Home"],
        [s.world.company, s.world.employee, "2026-11-27", "Work From Home"],
      ]),
      noEvents(),
    ),
  ],
});
