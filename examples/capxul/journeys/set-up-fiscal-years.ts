// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Fiscal Year `validate` (decisions/CX-ledger.md). Refusal order (fiscal-year/errors.ts):
// FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps, then the rule's FiscalYearNameTaken. A year not
// marked short ends the day before the same date a year on, by relativedelta: from 1 March 2031 that is 29 February
// 2032, and from 29 February 2036 it is 27 February 2037 (a year on from a leap day is 28 February). A short year may end
// earlier, never later. Years overlap when they share a day, both ends counted, and only a company's own years count.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { FiscalYearCreated } from "../blueprint/things/fiscal-year/events.ts";
import { FiscalYearEndsBeforeStart, FiscalYearNameTaken, FiscalYearOverlaps, FiscalYearWrongLength } from "../blueprint/things/fiscal-year/errors.ts";
import { machine as years } from "../blueprint/things/fiscal-year/machine.ts";
import create from "../blueprint/things/fiscal-year/verbs/create.ts";
import get from "../blueprint/things/fiscal-year/verbs/get.ts";

export default Blueprint.journey("set up fiscal years", {
  // Acme Trading has the fiscal year 2026, 1 January to 31 December 2026. Ada also runs Acme Logistics. Bo is signed in
  // and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a fiscal year",
  steps: (s) => {
    const year = (name: string, yearStartDate: string, yearEndDate: string, isShortYear = false) =>
      s.ada.run(create, { company: s.world.company, year: name, yearStartDate, yearEndDate, isShortYear });
    return [
      s.step(
        "the year 2026 reads back as Ada set it up",
        s.ada.run(get, { id: s.world.fiscalYear }),
        expect((a) => [a.company, a.year, a.yearStartDate, a.yearEndDate, a.isShortYear, a.state]).toEqual([
          s.world.company, "2026", "2026-01-01", "2026-12-31", false, "active",
        ]),
        noEvents(),
      ),
      s.step("Bo can't read it", s.bo.run(get, { id: s.world.fiscalYear }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor set up a year for Acme Trading",
        s.bo.run(create, { company: s.world.company, year: "2027", yearStartDate: "2027-01-01", yearEndDate: "2027-12-31", isShortYear: false }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["fiscal-year.create", "fiscal-year.create.insert"] }),
      ),
      s.step(
        "a year that ends the day before it starts is refused",
        year("2027", "2027-01-01", "2026-12-31"),
        refuses(FiscalYearEndsBeforeStart, { yearStartDate: "2027-01-01" }),
        noEvents(),
        spans({ absent: ["fiscal-year.create.insert"] }),
      ),
      s.step(
        "a short one too, a month back, which is judged before its length",
        year("2027", "2027-03-01", "2027-02-01", true),
        refuses(FiscalYearEndsBeforeStart, { yearStartDate: "2027-03-01" }),
      ),
      s.step(
        "and one that ends before it starts and overlaps 2026 is refused for its ends first",
        year("2027", "2026-06-01", "2026-05-31"),
        refuses(FiscalYearEndsBeforeStart, { yearStartDate: "2026-06-01" }),
      ),
      s.step("a year a day short is refused", year("2027", "2027-01-01", "2027-12-30"), refuses(FiscalYearWrongLength, { yearEndDate: "2027-12-31" })),
      s.step("so is a year a day long", year("2027", "2027-01-01", "2028-01-01"), refuses(FiscalYearWrongLength, { yearEndDate: "2027-12-31" })),
      s.step(
        "and a year a month short that isn't marked short",
        year("2027", "2027-04-01", "2028-02-29"),
        refuses(FiscalYearWrongLength, { yearEndDate: "2028-03-31" }),
      ),
      s.step(
        "a short year may not run longer than a year",
        year("2027", "2027-01-01", "2028-01-01", true),
        refuses(FiscalYearWrongLength, { yearEndDate: "2027-12-31" }),
      ),
      s.step(
        "a year from mid 2025 to mid 2026 is the right length, but shares half of 2026, and names it",
        year("2025-2026", "2025-07-01", "2026-06-30"),
        refuses(FiscalYearOverlaps, { fiscalYear: s.world.fiscalYear }),
        noEvents(),
        spans({ absent: ["fiscal-year.create.insert"] }),
      ),
      s.step(
        "a year that shares only 2026's last day overlaps it",
        year("2026-2027", "2026-12-31", "2027-12-30"),
        refuses(FiscalYearOverlaps, { fiscalYear: s.world.fiscalYear }),
      ),
      s.step(
        "and one that shares only its first day",
        year("2025-2026", "2025-01-02", "2026-01-01"),
        refuses(FiscalYearOverlaps, { fiscalYear: s.world.fiscalYear }),
      ),
      s.step(
        "a year of the wrong length that overlaps is refused for its length first",
        year("2026b", "2026-03-01", "2027-03-01"),
        refuses(FiscalYearWrongLength, { yearEndDate: "2027-02-28" }),
      ),
      s.step(
        "Ada sets up 2025, the year before, which touches 2026 without sharing a day",
        year("2025", "2025-01-01", "2025-12-31"),
        expect((a) => a.fiscalYear).toMatch(/^fyr_[0-9a-z]+$/),
        emits(FiscalYearCreated, { fiscalYear: s.last.fiscalYear, company: s.world.company, yearStartDate: "2025-01-01", yearEndDate: "2025-12-31" }),
        years.isIn(s.last.fiscalYear, "active"),
        spans({ present: ["fiscal-year.create", "fiscal-year.create.insert"] }),
      ),
      s.step(
        "a year from mid 2025 to mid 2026 now shares days with both, and names 2025, which starts first",
        year("2025-2026", "2025-07-01", "2026-06-30"),
        refuses(FiscalYearOverlaps, { fiscalYear: s.last.fiscalYear }),
        noEvents(),
      ),
      s.step(
        "it reads back as she typed it",
        s.ada.run(get, { id: s.last.fiscalYear }),
        expect((a) => [a.company, a.year, a.yearStartDate, a.yearEndDate, a.isShortYear, a.state]).toEqual([
          s.world.company, "2025", "2025-01-01", "2025-12-31", false, "active",
        ]),
      ),
      s.step("a new year may not take 2026's name", year("2026", "2027-01-01", "2027-12-31"), refuses(FiscalYearNameTaken), noEvents()),
      s.step(
        "and an overlapping one under 2026's name is refused for the overlap first",
        year("2026", "2026-02-01", "2027-01-31"),
        refuses(FiscalYearOverlaps, { fiscalYear: s.world.fiscalYear }),
      ),
      s.step("a short year of six months is allowed", year("2027 H1", "2027-01-01", "2027-06-30", true), expect((a) => a.fiscalYear).toMatch(/^fyr_/)),
      s.step(
        "it reads back short",
        s.ada.run(get, { id: s.last.fiscalYear }),
        expect((a) => [a.year, a.yearStartDate, a.yearEndDate, a.isShortYear]).toEqual(["2027 H1", "2027-01-01", "2027-06-30", true]),
      ),
      s.step("so is a short year of one day", year("Q3 day one", "2027-07-01", "2027-07-01", true), expect((a) => a.fiscalYear).toMatch(/^fyr_/)),
      s.step(
        "a short year is still judged for overlaps: one from June shares a day with the first half",
        year("2027 H2", "2027-06-30", "2027-12-31", true),
        refuses(FiscalYearOverlaps),
      ),
      s.step(
        "a full year may end on a leap day: 1 March 2031 to 29 February 2032",
        year("2031-2032", "2031-03-01", "2032-02-29"),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step(
        "from 1 March 2032, with no leap day to come, a year ends on 28 February 2033",
        year("2032-2033", "2032-03-01", "2033-02-28"),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step(
        "a year from a leap day ends on 27 February, not the 28th",
        year("2036-2037", "2036-02-29", "2037-02-28"),
        refuses(FiscalYearWrongLength, { yearEndDate: "2037-02-27" }),
      ),
      s.step("on the 27th it is allowed", year("2036-2037", "2036-02-29", "2037-02-27"), expect((a) => a.fiscalYear).toMatch(/^fyr_/)),
      s.step(
        "a year from 1 March 2039 ends on 29 February 2040, and the 28th is refused",
        year("2039-2040", "2039-03-01", "2040-02-28"),
        refuses(FiscalYearWrongLength, { yearEndDate: "2040-02-29" }),
      ),
      s.step(
        "Acme Logistics may keep its own 2026, on the same days, under the same name",
        s.ada.run(create, { company: s.world.otherCompany, year: "2026", yearStartDate: "2026-01-01", yearEndDate: "2026-12-31", isShortYear: false }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
        emits(FiscalYearCreated, { fiscalYear: s.last.fiscalYear, company: s.world.otherCompany }),
      ),
      s.step(
        "and it is Acme Logistics'",
        s.ada.run(get, { id: s.last.fiscalYear }),
        expect((a) => [a.company, a.year, a.yearStartDate, a.yearEndDate]).toEqual([s.world.otherCompany, "2026", "2026-01-01", "2026-12-31"]),
      ),
      s.step(
        "Acme Trading's 2026 is unchanged",
        s.ada.run(get, { id: s.world.fiscalYear }),
        expect((a) => [a.company, a.year, a.yearStartDate, a.yearEndDate, a.isShortYear]).toEqual([s.world.company, "2026", "2026-01-01", "2026-12-31", false]),
      ),
    ];
  },
});
