// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AttendanceRequestRejected } from "../blueprint/things/attendance-request/events.ts";
import { machine as requests } from "../blueprint/things/attendance-request/machine.ts";
import mark from "../blueprint/things/attendance/verbs/mark.ts";
import list from "../blueprint/things/attendance/verbs/list.ts";
import approve from "../blueprint/things/attendance-request/verbs/approve.ts";
import reject from "../blueprint/things/attendance-request/verbs/reject.ts";
import get from "../blueprint/things/attendance-request/verbs/get.ts";

type Item = { readonly id: string; readonly attendanceDate: string; readonly status: string };

export default Blueprint.journey("reject an attendance request", {
  // Olga was marked absent on 24 November and has asked to work from home 23 to 27 November; Ada runs Acme Trading.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an attendance request",
  steps: (s) => [
    s.step(
      "Ada marks Olga present on the Wednesday, in the office",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-25", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "and working from home on the Thursday, as the request asks",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-26", status: "Work From Home" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
    s.step(
      "Olga can't reject her own request",
      s.olga.run(reject, { attendanceRequest: s.world.attendanceRequest }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["attendance-request.reject", "attendance-request.reject.update"] }),
    ),
    s.step(
      "nor can Bo",
      s.bo.run(reject, { attendanceRequest: s.world.attendanceRequest }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada rejects it",
      s.ada.run(reject, { attendanceRequest: s.world.attendanceRequest }),
      expect((a) => a.attendanceRequest).toBe(s.world.attendanceRequest),
      emits(AttendanceRequestRejected, { attendanceRequest: s.world.attendanceRequest }),
      requests.isIn(s.world.attendanceRequest, "rejected"),
      spans({ present: ["attendance-request.reject", "attendance-request.reject.update"] }),
    ),
    s.step(
      "it reads back rejected, as she asked it",
      s.olga.run(get, { id: s.world.attendanceRequest }),
      expect((a) => [a.company, a.employee, a.fromDate, a.toDate, a.reason, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-23",
        "2026-11-27",
        "Work From Home",
        "rejected",
      ]),
      noEvents(),
    ),
    s.step(
      "it can't then be approved",
      s.ada.run(approve, { attendanceRequest: s.world.attendanceRequest }),
      refuses(requests.notFrom, { state: "rejected" }),
      noEvents(),
      spans({ absent: ["attendance-request.approve.mark"] }),
    ),
    s.step(
      "nor rejected again",
      s.ada.run(reject, { attendanceRequest: s.world.attendanceRequest }),
      refuses(requests.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "it marked nothing, and left each day in its range as it was",
      s.olga.run(list, { employee: s.world.employee }),
      expect((p) => [...p.items].sort((a: Item, b: Item) => (a.attendanceDate < b.attendanceDate ? -1 : 1)).map((i: Item) => [i.attendanceDate, i.status])).toEqual([
        ["2026-11-24", "Absent"],
        ["2026-11-25", "Present"],
        ["2026-11-26", "Work From Home"],
      ]),
      expect((p) => p.items.filter((i: Item) => i.attendanceDate === "2026-11-24").map((i: Item) => i.id)).toEqual([s.world.attendance]),
      noEvents(),
    ),
    s.step(
      "so Ada may mark the Friday present",
      s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-27", status: "Present" }),
      expect((a) => a.attendance).toMatch(/^att_[0-9a-z]+$/),
    ),
  ],
});
