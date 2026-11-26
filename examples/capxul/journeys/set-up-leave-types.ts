// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Leave Type, per company (decisions/CX-leave.md, call 8): a name unique in its company, a whole number of days
// in a row (0 for no limit), and two yes-or-nos, leave without pay and whether holidays count.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { LeaveTypeNameTaken } from "../blueprint/things/leave-type/errors.ts";
import { LeaveTypeCreated } from "../blueprint/things/leave-type/events.ts";
import { machine as types } from "../blueprint/things/leave-type/machine.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import create from "../blueprint/things/leave-type/verbs/create.ts";
import get from "../blueprint/things/leave-type/verbs/get.ts";

/** A type as it reads back: [company, name, max days in a row, without pay, holidays counted, state]. */
const read = (a: { company: string; leaveTypeName: string; maxContinuousDaysAllowed: bigint; isLwp: boolean; includeHoliday: boolean; state: string }) =>
  [a.company, a.leaveTypeName, a.maxContinuousDaysAllowed, a.isLwp, a.includeHoliday, a.state];

export default Blueprint.journey("set up leave types", {
  // Olga works at Acme Trading, which Ada runs. Bo is signed in and runs nothing of hers.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an employee",
  steps: (s) => [
    s.step(
      "Ada adds Annual Leave: at most 5 days in a row, paid, holidays not counted",
      s.ada.run(create, { company: s.world.company, leaveTypeName: "ANNUAL-LV", maxContinuousDaysAllowed: 5n, isLwp: false, includeHoliday: false }),
      expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
      emits(LeaveTypeCreated, { company: s.world.company }),
      types.isIn(s.last.leaveType, "active"),
      spans({ present: ["leave-type.create", "leave-type.create.insert"] }),
    ),
    s.step(
      "it reads back as she typed it",
      s.ada.run(get, { id: s.last.leaveType }),
      expect((a) => read(a)).toEqual([s.world.company, "ANNUAL-LV", 5n, false, false, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds Leave Without Pay: no limit, unpaid, holidays counted",
      s.ada.run(create, { company: s.world.company, leaveTypeName: "UNPAID-LV", maxContinuousDaysAllowed: 0n, isLwp: true, includeHoliday: true }),
      expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back with no limit, unpaid and holidays counted",
      s.ada.run(get, { id: s.last.leaveType }),
      expect((a) => read(a)).toEqual([s.world.company, "UNPAID-LV", 0n, true, true, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a sick leave type, its name in lower case: at most 12 days in a row, paid, holidays counted",
      s.ada.run(create, { company: s.world.company, leaveTypeName: "sick-lv, lower", maxContinuousDaysAllowed: 12n, isLwp: false, includeHoliday: true }),
      expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back as typed",
      s.ada.run(get, { id: s.last.leaveType }),
      expect((a) => read(a)).toEqual([s.world.company, "sick-lv, lower", 12n, false, true, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds Study Leave: unpaid, holidays not counted, at most 400 days in a row",
      s.ada.run(create, { company: s.world.company, leaveTypeName: "STUDY-LV", maxContinuousDaysAllowed: 400n, isLwp: true, includeHoliday: false }),
      expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back unpaid with holidays not counted",
      s.ada.run(get, { id: s.last.leaveType }),
      expect((a) => read(a)).toEqual([s.world.company, "STUDY-LV", 400n, true, false, "active"]),
      noEvents(),
    ),
    s.step(
      "Annual Leave can't be added twice to Acme Trading",
      s.ada.run(create, { company: s.world.company, leaveTypeName: "ANNUAL-LV", maxContinuousDaysAllowed: 10n, isLwp: false, includeHoliday: true }),
      refuses(LeaveTypeNameTaken, { leaveTypeName: "ANNUAL-LV" }),
      noEvents(),
    ),
    s.step(
      "Olga can't add a leave type",
      s.olga.run(create, { company: s.world.company, leaveTypeName: "OLGA-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: false }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["leave-type.create", "leave-type.create.insert"] }),
    ),
    s.step(
      "nor can Bo, to Acme Trading",
      s.bo.run(create, { company: s.world.company, leaveTypeName: "BO-LV", maxContinuousDaysAllowed: 0n, isLwp: false, includeHoliday: false }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo sets up Bo Ltd",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Tanzania", defaultCurrency: "TZS" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can add Annual Leave to his own company, though Acme Trading has one",
      s.bo.run(create, { company: s.last.company, leaveTypeName: "ANNUAL-LV", maxContinuousDaysAllowed: 3n, isLwp: false, includeHoliday: true }),
      expect((a) => a.leaveType).toMatch(/^lty_[0-9a-z]+$/),
      emits(LeaveTypeCreated, {}),
    ),
    s.step(
      "Ada can't read Bo's",
      s.ada.run(get, { id: s.last.leaveType }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads his back, in his own company, as he typed it",
      s.bo.run(get, { id: s.last.leaveType }),
      expect((a) => [a.leaveTypeName, a.maxContinuousDaysAllowed, a.isLwp, a.includeHoliday, a.company === s.world.company]).toEqual([
        "ANNUAL-LV",
        3n,
        false,
        true,
        false,
      ]),
      noEvents(),
    ),
  ],
});
