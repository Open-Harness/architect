// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The list holds only Monday 14 August 2028, so a check on the year or a walk past its end shows here.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { WeeklyOffAdded } from "../blueprint/things/holiday-list/events.ts";
import { HolidayAdded } from "../blueprint/things/holiday/events.ts";
import { HolidayDateTaken, HolidayOutsideList } from "../blueprint/things/holiday/errors.ts";
import addWeeklyOff from "../blueprint/things/holiday-list/verbs/add-weekly-off.ts";
import getList from "../blueprint/things/holiday-list/verbs/get.ts";
import add from "../blueprint/things/holiday/verbs/add.ts";

export default Blueprint.journey("a one-day list", {
  cast: { ada: owner },
  starts: "a one-day list",
  steps: (s) => [
    s.step(
      "the day before its only day is outside it",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-08-13", description: "Too early" }),
      refuses(HolidayOutsideList, { fromDate: "2028-08-14", toDate: "2028-08-14" }),
      noEvents(),
    ),
    s.step(
      "so is the day after",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-08-15", description: "Too late" }),
      refuses(HolidayOutsideList, { fromDate: "2028-08-14", toDate: "2028-08-14" }),
      noEvents(),
    ),
    s.step(
      "a weekday the list doesn't hold adds nothing",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Sunday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([0n, 0n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, weekday: "Sunday", added: 0n, totalHolidays: 0n }),
    ),
    s.step(
      "its own weekday adds its one day",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Monday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([1n, 1n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, weekday: "Monday", added: 1n, totalHolidays: 1n }),
    ),
    s.step(
      "that day is then taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-08-14", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2028-08-14" }),
      noEvents(),
    ),
    s.step(
      "the list counts one",
      s.ada.run(getList, { id: s.world.holidayList }),
      expect((a) => [a.fromDate, a.toDate, a.totalHolidays]).toEqual(["2028-08-14", "2028-08-14", 1n]),
      noEvents(),
    ),
  ],
});
