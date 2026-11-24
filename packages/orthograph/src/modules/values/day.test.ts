// Dates, part one (#866): a calendar day, apart from the clock. ERPNext's Date (posting, due, joining and relieving days)
// is a day with no time; `Blueprint.instant` is a moment, so a day held as one shifts with the zone it is read in (#742,
// item 5). Capxul holds days as `YYYY-MM-DD` text today (`examples/capxul/blueprint/values/employee.ts`, `Day`).
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. `Blueprint.day()` is a value: `YYYY-MM-DD` in code and on the wire, a day the calendar has, and its meta is
//     `{ type: "day" }`, its own kind as an instant is (it travels as text, but clients parse it as a day).
//  2. `Days`, exported by `orthograph` beside `Blueprint`, does a day's arithmetic without a clock, so a handler never
//     reaches for `Date` (AGENTS.md): `Days.weekday(day)` names its weekday as ERPNext does ("Monday" to "Sunday"),
//     `Days.add(day, n)` moves it by whole days (n may be negative), and `Days.between(from, to)` counts the days from one
//     to the other (negative when `to` comes first). Each answers the same in every time zone.
//  3. Fiscal years and periods are ERPNext doctypes (Fiscal Year, Accounting Period), so they are Capxul's things on this
//     value, in Goal 16's slice 7, not values of their own.
//
// `Blueprint` and `Days` are read loosely so this file type-checks before and after the surface exists.
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import * as Orthograph from "../../index.ts";
import type { Value } from "./types.ts";

type Day = string;
interface DaysApi {
  readonly weekday: (day: Day) => string;
  readonly add: (day: Day, days: number) => Day;
  readonly between: (from: Day, to: Day) => number;
}

const day = (): Value => {
  const surface = Orthograph.Blueprint as unknown as { readonly day?: () => Value };
  if (typeof surface.day !== "function") throw new Error("Blueprint.day is not there: Dates (#866) adds it");
  return surface.day();
};
const days = (): DaysApi => {
  const surface = (Orthograph as unknown as { readonly Days?: DaysApi }).Days;
  if (surface === undefined) throw new Error("Days is not exported by orthograph: Dates (#866) adds it");
  return surface;
};
const decode = (x: unknown) => Schema.decodeUnknownExit(day().schema as never)(x)._tag;

const zone = process.env["TZ"];
afterEach(() => {
  if (zone === undefined) delete process.env["TZ"];
  else process.env["TZ"] = zone;
});

describe("Dates: a calendar day is a value", () => {
  it("describes itself for the model as a day, public, and keeps that when named", () => {
    expect(day().meta).toEqual({ type: "day" });
    expect(day().visibility).toBe("public");
    expect(Orthograph.Blueprint.value(day()).meta).toEqual({ type: "day" });
  });

  it("holds a day the calendar has, leap days included", () => {
    for (const good of ["2027-01-01", "2027-12-31", "2024-02-29", "2000-02-29", "2026-11-24"]) expect(decode(good), good).toBe("Success");
  });

  it("refuses a day the calendar lacks: February 30th, a leap day in a common year or a century, month 13, day 32", () => {
    for (const bad of ["2027-02-29", "2100-02-29", "2026-02-30", "2027-04-31", "2027-13-01", "2027-00-10", "2027-01-32", "2027-01-00"]) {
      expect(decode(bad), bad).toBe("Failure");
    }
  });

  it("refuses anything but YYYY-MM-DD: a moment, a short form, spaces, empty text, a number", () => {
    for (const bad of ["2027-01-05T00:00:00.000Z", "2027-1-05", "2027-01-5", "27-01-05", " 2027-01-05", "2027-01-05 ", "2027/01/05", ""]) {
      expect(decode(bad), JSON.stringify(bad)).toBe("Failure");
    }
    expect(decode(20270105)).toBe("Failure");
  });

  it("travels on the wire exactly as written", () => {
    expect(Schema.encodeSync(day().schema as never)("2024-02-29" as never)).toBe("2024-02-29");
  });
});

describe("Dates: a day's arithmetic needs no clock", () => {
  it("names a day's weekday as ERPNext does, Sunday included", () => {
    const { weekday } = days();
    // 2027 starts on a Friday; 3 January 2027 is a Sunday; 29 February 2000 was a Tuesday; 31 December 2027 is a Friday.
    expect([weekday("2027-01-01"), weekday("2027-01-03"), weekday("2027-01-04"), weekday("2000-02-29"), weekday("2027-12-31")]).toEqual([
      "Friday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Friday",
    ]);
    expect(["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08", "2027-01-09", "2027-01-10"].map(weekday)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("adds whole days across a month's, a leap year's and a year's end, back and forth", () => {
    const { add } = days();
    expect(add("2024-02-28", 1)).toBe("2024-02-29");
    expect(add("2023-02-28", 1)).toBe("2023-03-01");
    expect(add("2026-12-31", 1)).toBe("2027-01-01");
    expect(add("2027-01-01", -1)).toBe("2026-12-31");
    expect(add("2024-03-01", -1)).toBe("2024-02-29");
    expect(add("2027-01-03", 7 * 51)).toBe("2027-12-26");
    expect(add("2027-06-13", 0)).toBe("2027-06-13");
  });

  it("counts the days between two days, negative when the second comes first", () => {
    const { between } = days();
    expect(between("2027-01-01", "2027-12-31")).toBe(364);
    expect(between("2024-01-01", "2025-01-01")).toBe(366);
    expect(between("2027-12-31", "2027-01-01")).toBe(-364);
    expect(between("2027-06-13", "2027-06-13")).toBe(0);
    expect(between("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("answers the same in a zone whose clocks change: a day that is 25 hours long there is still one day", () => {
    process.env["TZ"] = "America/New_York";
    const { add, between, weekday } = days();
    // New York's clocks go back on 7 November 2027 and forward on 14 March 2027.
    expect(add("2027-11-07", 1)).toBe("2027-11-08");
    expect(add("2027-03-15", -1)).toBe("2027-03-14");
    expect(between("2027-11-07", "2027-11-08")).toBe(1);
    expect(between("2027-03-13", "2027-03-15")).toBe(2);
    expect(weekday("2027-11-07")).toBe("Sunday");
    process.env["TZ"] = "Pacific/Kiritimati";
    expect(weekday("2027-01-01")).toBe("Friday");
    expect(add("2027-12-31", 1)).toBe("2028-01-01");
  });
});
