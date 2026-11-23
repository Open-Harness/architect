// The checked-in list, the held-off list and the evals agree: nothing switched on is unjudged, nothing held off is also on, and every cell a
// journey touches (the seven rows Plugged In's journeys use, in all nine outputs) is either judged or held off with a reason.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Grid } from "../grid/service.ts";
import { OUTPUTS } from "../grid/types.ts";
import { RefusalEvals } from "../refusal-evals/service.ts";
import { ProjectEvals } from "./service.ts";

const read = <A>(path: string) => JSON.parse(readFileSync(join(import.meta.dirname, "../../..", path), "utf8")) as A;
const list = Grid.parse(read("switched-on.json"));
const held = read<{ readonly cells: Readonly<Record<string, string>> }>("held-off.json").cells;
const grid = JSON.parse(readFileSync(join(import.meta.dirname, "../../../../../design/grid/grid.json"), "utf8")) as { readonly cells: ReadonlyArray<{ readonly id: string }> };
const judged: ReadonlyArray<string> = [...RefusalEvals.evals, ...ProjectEvals.evals].map((e) => e.cell);
const TOUCHED_ROWS = ["error", "event", "invariant", "journey", "machine", "operation", "step", "thing"];

describe("the evals", () => {
  it("are one per cell, so no cell is judged twice", () => {
    expect(new Set(judged).size).toBe(judged.length);
  });
  it("are all of K14's cells", () => {
    const cells = new Set(grid.cells.map((c) => c.id));
    for (const cell of judged) expect(cells.has(cell), cell).toBe(true);
  });
  it("cover every output of the eight rows the journeys touch, except the cells held off", () => {
    const wanted = TOUCHED_ROWS.flatMap((row) => OUTPUTS.map((output) => `${row}.${output}`));
    const missing = wanted.filter((cell) => !judged.includes(cell) && held[cell] === undefined);
    expect(missing).toEqual([]);
  });
});

describe("the list of switched-on cells", () => {
  it("is valid", () => {
    expect(list.ok).toBe(true);
  });
  it("holds no cell without an eval: that would be red for nothing", () => {
    const on = list.ok ? list.value.cells.map((c) => c.cell) : [];
    expect(on.filter((cell) => !judged.includes(cell))).toEqual([]);
  });
  it("holds no cell that is held off", () => {
    const on = list.ok ? list.value.cells.map((c) => c.cell) : [];
    expect(on.filter((cell) => held[cell] !== undefined)).toEqual([]);
  });
});

describe("the held-off cells", () => {
  it("are cells of the grid, each with the reason and what it waits for", () => {
    const cells = new Set(grid.cells.map((c) => c.id));
    for (const [cell, reason] of Object.entries(held)) {
      expect(cells.has(cell), cell).toBe(true);
      expect(reason.length, cell).toBeGreaterThan(20);
    }
  });
  it("are eleven: error.cli, error.mcp and invariant.cli (prove --through), and the eight not-needed cells K14 asks Aaron about", () => {
    expect(Object.keys(held).sort()).toEqual(["error.cli", "error.mcp", "event.api", "event.cli", "event.mcp", "event.sdk", "invariant.cli", "journey.api", "journey.cli", "journey.mcp", "journey.sdk"]);
  });
});

describe("the expected-red list", () => {
  const expected = Grid.parseExpected(read("expected-red.json"));
  const pairs = expected.ok ? expected.value : [];
  const on = new Set(list.ok ? list.value.cells.flatMap((c) => c.subjects.map((s) => `${c.cell}:${s}`)) : []);
  it("is valid", () => {
    expect(expected.ok).toBe(true);
  });
  it("lists only pairs that are switched on, so a pair cannot hide in it", () => {
    expect(pairs.map((p) => `${p.cell}:${p.subject}`).filter((k) => !on.has(k))).toEqual([]);
  });
  it("names, for each pair, a slice or a package file that turns it green", () => {
    for (const p of pairs) expect(p.waitsOn, `${p.cell}:${p.subject}`).toMatch(/M\d|ST\d|packages\//);
  });
});
