// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { HolidayAdded } from "../blueprint/things/holiday/events.ts";
import { HolidayDateTaken, HolidayOutsideList } from "../blueprint/things/holiday/errors.ts";
import { machine } from "../blueprint/things/holiday/machine.ts";
import add from "../blueprint/things/holiday/verbs/add.ts";
import getHoliday from "../blueprint/things/holiday/verbs/get.ts";
import getList from "../blueprint/things/holiday-list/verbs/get.ts";

export default Blueprint.journey("add holidays", {
  // Ada's list runs from 1 January to 31 December 2027. Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a holiday list",
  steps: (s) => [
    s.step(
      "Ada adds the list's first day",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-01-01", description: "New Year's Day" }),
      expect((a) => [a.totalHolidays]).toEqual([1n]),
      expect((a) => a.holiday).toMatch(/^hol_[0-9a-z]+$/),
      emits(HolidayAdded, { holiday: s.last.holiday, holidayList: s.world.holidayList, holidayDate: "2027-01-01" }),
      machine.isIn(s.last.holiday, "active"),
      spans({ present: ["holiday.add", "holiday.add.load", "holiday.add.insert"] }),
    ),
    s.step(
      "Bo can't read the new holiday",
      s.bo.run(getHoliday, { id: s.last.holiday }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "the holiday reads back as she typed it",
      s.ada.run(getHoliday, { id: s.last.holiday }),
      expect((a) => [a.holidayList, a.holidayDate, a.description, a.state]).toEqual([
        s.world.holidayList,
        "2027-01-01",
        "New Year's Day",
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "the same day can't be added twice",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-01-01", description: "Again" }),
      refuses(HolidayDateTaken, { holidayDate: "2027-01-01" }),
      noEvents(),
    ),
    s.step(
      "a day before the list starts is refused",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2026-12-31", description: "Too early" }),
      refuses(HolidayOutsideList, { fromDate: "2027-01-01", toDate: "2027-12-31" }),
      noEvents(),
      spans({ present: ["holiday.add.load"], absent: ["holiday.add.insert"] }),
    ),
    s.step(
      "so is a day after it ends",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2028-01-01", description: "Too late" }),
      refuses(HolidayOutsideList, { fromDate: "2027-01-01", toDate: "2027-12-31" }),
      noEvents(),
    ),
    s.step(
      "Bo can't add a day to Ada's list",
      s.bo.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-05-01", description: "Bo's day" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["holiday.add", "holiday.add.insert"] }),
    ),
    s.step(
      "the list's last day may be a holiday too",
      s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-12-31", description: "New Year's Eve" }),
      expect((a) => [a.totalHolidays]).toEqual([2n]),
      emits(HolidayAdded, { holiday: s.last.holiday, holidayList: s.world.holidayList, holidayDate: "2027-12-31" }),
    ),
    s.step(
      "that one reads back with its own day and name",
      s.ada.run(getHoliday, { id: s.last.holiday }),
      expect((a) => [a.holidayList, a.holidayDate, a.description]).toEqual([s.world.holidayList, "2027-12-31", "New Year's Eve"]),
      noEvents(),
    ),
    s.step(
      "the list now counts two holidays",
      s.ada.run(getList, { id: s.world.holidayList }),
      expect((a) => [a.holidayListName, a.fromDate, a.toDate, a.totalHolidays]).toEqual([
        "Kenya 2027",
        "2027-01-01",
        "2027-12-31",
        2n,
      ]),
      noEvents(),
    ),
  ],
});
