// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { HolidayListCreated } from "../blueprint/things/holiday-list/events.ts";
import { HolidayListEndsBeforeStart, HolidayListNameTaken } from "../blueprint/things/holiday-list/errors.ts";
import { machine } from "../blueprint/things/holiday-list/machine.ts";
import create from "../blueprint/things/holiday-list/verbs/create.ts";
import get from "../blueprint/things/holiday-list/verbs/get.ts";

export default Blueprint.journey("set up a holiday list", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada starts a list for a year",
      s.ada.run(create, { company: s.world.company, holidayListName: "Kenya 2027", fromDate: "2027-01-01", toDate: "2027-12-31" }),
      expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/),
      emits(HolidayListCreated, { holidayList: s.last.holidayList, company: s.world.company }),
      machine.isIn(s.last.holidayList, "active"),
      spans({ present: ["holiday-list.create", "holiday-list.create.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's list",
      s.bo.run(get, { id: s.last.holidayList }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "the list reads back as she typed it, with no holidays yet",
      s.ada.run(get, { id: s.last.holidayList }),
      expect((a) => [a.company, a.holidayListName, a.fromDate, a.toDate, a.totalHolidays, a.state]).toEqual([
        s.world.company,
        "Kenya 2027",
        "2027-01-01",
        "2027-12-31",
        0n,
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "a list can't end before it starts",
      s.ada.run(create, { company: s.world.company, holidayListName: "Backwards", fromDate: "2027-12-31", toDate: "2027-01-01" }),
      refuses(HolidayListEndsBeforeStart, { fromDate: "2027-12-31" }),
      noEvents(),
      spans({ absent: ["holiday-list.create.insert"] }),
    ),
    s.step(
      "a second list can't take the first one's name",
      s.ada.run(create, { company: s.world.company, holidayListName: "Kenya 2027", fromDate: "2028-01-01", toDate: "2028-12-31" }),
      refuses(HolidayListNameTaken, { holidayListName: "Kenya 2027" }),
      noEvents(),
    ),
    s.step(
      "Bo can't start a list in Ada's company",
      s.bo.run(create, { company: s.world.company, holidayListName: "Bo's days", fromDate: "2027-01-01", toDate: "2027-12-31" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["holiday-list.create", "holiday-list.create.insert"] }),
    ),
    s.step(
      "a list may start and end on the same day",
      s.ada.run(create, { company: s.world.company, holidayListName: "Shutdown", fromDate: "2028-08-14", toDate: "2028-08-14" }),
      expect((a) => a.holidayList).toMatch(/^hls_[0-9a-z]+$/),
      emits(HolidayListCreated, { holidayList: s.last.holidayList, company: s.world.company }),
    ),
    s.step(
      "that one reads back with its own name and days",
      s.ada.run(get, { id: s.last.holidayList }),
      expect((a) => [a.company, a.holidayListName, a.fromDate, a.toDate, a.totalHolidays, a.state]).toEqual([
        s.world.company,
        "Shutdown",
        "2028-08-14",
        "2028-08-14",
        0n,
        "active",
      ]),
      noEvents(),
    ),
  ],
});
