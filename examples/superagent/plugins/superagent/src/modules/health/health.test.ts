import { describe, expect, it } from "vitest";
import { healthOf } from "./service.ts";

const watched = (failures: number, after = 3) => ({ kind: "source", id: `src_${failures}`, name: "github", failures, after });

describe("health", () => {
  it("shows a record only once it has failed as often in a row as it shows at", () => {
    const h = healthOf(undefined, { watched: [watched(2), watched(3), watched(5)] });
    expect(h.problems.map((p) => p.failures)).toEqual([3, 5]);
    expect(h.more).toBe(false);
  });

  it("cuts at 25 and says so", () => {
    const h = healthOf(undefined, { watched: Array.from({ length: 30 }, () => watched(4)) });
    expect(h.problems).toHaveLength(25);
    expect(h.more).toBe(true);
  });
});
