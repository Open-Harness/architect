// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// 2027 starts and ends on a Friday, so it has 53 Fridays, 52 Sundays and 52 Mondays.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { WeeklyOffAdded } from "../blueprint/things/holiday-list/events.ts";
import { machine } from "../blueprint/things/holiday-list/machine.ts";
import { HolidayDateTaken } from "../blueprint/things/holiday/errors.ts";
import addWeeklyOff from "../blueprint/things/holiday-list/verbs/add-weekly-off.ts";
import getList from "../blueprint/things/holiday-list/verbs/get.ts";
import add from "../blueprint/things/holiday/verbs/add.ts";
import getHoliday from "../blueprint/things/holiday/verbs/get.ts";

export default Blueprint.journey("weekly offs", {
  // Ada's 2027 list already holds Sunday 3 January, Founders' Day. Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a sunday holiday",
  steps: (s) => [
    s.step(
      "Bo can't add a weekly off to Ada's list",
      s.bo.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Sunday" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["holiday-list.add-weekly-off", "holiday-list.add-weekly-off.record"] }),
    ),
    s.step(
      "Ada makes a weekday a day off, and the day the list already held is skipped",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Sunday" }),
      expect((a) => [a.holidayList, a.weekday, a.added, a.totalHolidays]).toEqual([s.world.holidayList, "Sunday", 51n, 52n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, weekday: "Sunday", added: 51n, totalHolidays: 52n }),
      machine.isIn(s.world.holidayList, "active"),
      spans({ present: ["holiday-list.add-weekly-off", "holiday-list.add-weekly-off.load", "holiday-list.add-weekly-off.record"] }),
    ),
    s.step(
      "the day it held keeps its own name",
      s.ada.run(getHoliday, { id: s.world.holiday }),
      expect((a) => [a.holidayDate, a.description]).toEqual(["2027-01-03", "Founders' Day"]),
      noEvents(),
    ),
    s.step(
      "a day in the middle of the year is now taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-06-13", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2027-06-13" }),
      noEvents(),
    ),
    s.step(
      "and so is the last one of the year",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-12-26", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2027-12-26" }),
      noEvents(),
    ),
    s.step(
      "a weekday that falls on both the first and the last day counts both",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Friday" }),
      expect((a) => [a.weekday, a.added, a.totalHolidays]).toEqual(["Friday", 53n, 105n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, weekday: "Friday", added: 53n, totalHolidays: 105n }),
    ),
    s.step(
      "the first day is taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-01-01", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2027-01-01" }),
      noEvents(),
    ),
    s.step(
      "and so is the last",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-12-31", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2027-12-31" }),
      noEvents(),
    ),
    s.step(
      "asking for the same weekday again adds nothing",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Friday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([0n, 105n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, added: 0n, totalHolidays: 105n }),
    ),
    s.step(
      "a day of another weekday may still be added",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-01-04", description: "Picnic" }),
      expect((a) => [a.totalHolidays]).toEqual([106n]),
    ),
    s.step(
      "the list counts every one of them",
      s.ada.run(getList, { id: s.world.holidayList }),
      expect((a) => [a.totalHolidays, a.state]).toEqual([106n, "active"]),
      noEvents(),
    ),
  ],
});
