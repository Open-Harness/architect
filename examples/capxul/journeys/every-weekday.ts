// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The list runs from Tuesday 2028-02-22 to Tuesday 2028-03-07, fifteen days across 29 February. Every weekday is asked
// for once, so each one's place in the week is judged: Tuesday falls three times (22nd, 29th, 7th), every other twice.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { WeeklyOffAdded } from "../blueprint/things/holiday-list/events.ts";
import { HolidayDateTaken } from "../blueprint/things/holiday/errors.ts";
import addWeeklyOff from "../blueprint/things/holiday-list/verbs/add-weekly-off.ts";
import getList from "../blueprint/things/holiday-list/verbs/get.ts";
import add from "../blueprint/things/holiday/verbs/add.ts";

export default Blueprint.journey("every weekday", {
  cast: { ada: owner },
  starts: "a leap fortnight",
  steps: (s) => [
    s.step(
      "the weekday the list starts and ends on adds three, the leap day among them",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Tuesday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([3n, 3n]),
      emits(WeeklyOffAdded, { holidayList: s.world.holidayList, weekday: "Tuesday", added: 3n, totalHolidays: 3n }),
    ),
    s.step(
      "the leap day is then taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-02-29", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2028-02-29" }),
      noEvents(),
    ),
    s.step(
      "the day after it adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Wednesday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 5n]),
    ),
    s.step(
      "the first of March is then taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-03-01", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2028-03-01" }),
      noEvents(),
    ),
    s.step(
      "the third weekday adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Thursday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 7n]),
    ),
    s.step(
      "the second of March is then taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-03-02", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2028-03-02" }),
      noEvents(),
    ),
    s.step(
      "the fourth weekday adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Friday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 9n]),
    ),
    s.step(
      "the fifth weekday adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Saturday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 11n]),
    ),
    s.step(
      "the fourth of March is then taken",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-03-04", description: "Picnic" }),
      refuses(HolidayDateTaken, { holidayDate: "2028-03-04" }),
      noEvents(),
    ),
    s.step(
      "the sixth weekday adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Sunday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 13n]),
    ),
    s.step(
      "the last weekday adds two",
      s.ada.run(addWeeklyOff, { holidayList: s.world.holidayList, weekday: "Monday" }),
      expect((a) => [a.added, a.totalHolidays]).toEqual([2n, 15n]),
    ),
    s.step(
      "every day of the list is now a holiday",
      s.ada.run(getList, { id: s.world.holidayList }),
      expect((a) => [a.fromDate, a.toDate, a.totalHolidays]).toEqual(["2028-02-22", "2028-03-07", 15n]),
      noEvents(),
    ),
  ],
});
