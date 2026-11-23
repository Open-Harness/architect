// Journey-author file: a journey can't send a payload its schema refuses, so the calendar check on Day is proved here.
import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { Day } from "../blueprint/values/employee.ts";

const accepts = (text: string) => Schema.is(Day.schema)(text);

describe("Day", () => {
  it("takes days the calendar has, a leap day in a leap year among them", () => {
    expect(["2026-01-05", "2026-02-28", "2024-02-29", "2000-02-29", "2026-04-30", "2026-12-31"].map(accepts)).toEqual([
      true, true, true, true, true, true,
    ]);
  });
  it("refuses days the calendar doesn't have, however well shaped", () => {
    expect(["2026-02-31", "2025-02-29", "1900-02-29", "2026-04-31", "2026-06-31", "2026-13-01", "2026-1-05"].map(accepts)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });
});
