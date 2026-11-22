import { describe, expect, it } from "vitest";
import { whenWords } from "./internal/when.ts";

describe("when a move made by time happens, in words", () => {
  it("says each anchor in the words M8-checks fixes", () => {
    expect(whenWords("membership", { by: { kind: "every", span: "1 month", from: "startedAt" }, late: "10 minutes" }, "`")).toBe("every month from `startedAt`, by the keeper, up to 10 minutes late");
    expect(whenWords("membership", { by: { kind: "after", field: "overdueAt", span: "14 days" } }, "`")).toBe("14 days after `overdueAt`, by the keeper");
    expect(whenWords("budget", { by: { kind: "every", span: "1 month", on: { day: 25 }, zone: "Europe/London" } }, "")).toBe("every month on day 25, in Europe/London, by the keeper");
    expect(whenWords("budget", { by: { kind: "every", span: "1 month", on: { day: "last" }, zone: "Europe/London" } }, "")).toBe("every month on the last day, in Europe/London, by the keeper");
    expect(whenWords("budget", { by: { kind: "every", span: "2 weeks", on: { weekday: "friday" }, zone: "Europe/London" } }, "")).toBe("every 2 weeks on friday, in Europe/London, by the keeper");
  });

  it("says a lazy move is worked out at the thing's next use, never by the keeper", () => {
    expect(whenWords("purse", { by: { kind: "every", span: "1 month", from: "openedAt" }, lazy: true }, "`")).toBe("every month from `openedAt`, worked out at the purse's next use");
  });
});
