// Run: node --test spikes/mission-board/src/data/derive.test.ts
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { changedSince, climb, climbTimes, join, matches, type LaneView } from "./derive.ts";
import type { Board, Grid } from "./types.ts";

const load = <A>(name: string): A => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8")) as A;
const grid = load<Grid>("./grid/grid.json");
const board = load<Board>("./board.fixture.json");
const moved = load<Board>("./board.illustrative.json");
const lane = <L extends { readonly block: { readonly id: string } }>(lanes: ReadonlyArray<L>, id: string): L => lanes.find((l) => l.block.id === id)!;
const cardOf = (lanes: ReadonlyArray<LaneView>, cell: string) =>
  lane(lanes, cell.split(".")[0]!).cards.find((c) => c.cell.id === cell)!;

test("lanes come in the hill-climb order, each with a card per output in output order", () => {
  const view = join(grid, board);
  deepEqual(view.lanes.map((l) => l.block.id).slice(0, 3), ["operation", "error", "thing"]);
  equal(view.lanes.length, 14);
  for (const l of view.lanes) deepEqual(l.cards.map((c) => c.output.id), view.outputs.map((o) => o.id));
});

test("with no history, the board shows the grid's states: nothing green until a verdict lands", () => {
  const view = join(grid, board);
  deepEqual(view.score, { green: 0, built: 52, partly: 37, red: 37, notNeeded: 0, needed: 126 });
  deepEqual(lane(view.lanes, "visibility").cards.map((c) => c.state),
    ["built", "red", "red", "red", "partly", "built", "partly", "red", "built"]);
  equal(view.illustrative, false);
});

test("a card links to its slice, the thread on it, and Aaron's question that decides it", () => {
  const view = join(grid, board);
  const api = cardOf(view.lanes, "visibility.api");
  equal(api.task?.ref, "M1.35");
  equal(api.thread?.id, "m1-lead");
  equal(cardOf(view.lanes, "step.sdk").question?.id, "Q1");
  equal(api.question, null);
});

test("a card lists the outputs it depends on that aren't green yet in its lane", () => {
  deepEqual(cardOf(join(grid, board).lanes, "operation.server").waitsOn, ["model", "api"]);
  const view = join(grid, moved);
  deepEqual(cardOf(view.lanes, "operation.server").waitsOn, []);
  deepEqual(cardOf(view.lanes, "operation.portal").waitsOn, ["docs", "telemetry"]);
});

test("history moves a card: the latest event wins", () => {
  const view = join(grid, moved);
  equal(cardOf(view.lanes, "visibility.api").state, "built");
  deepEqual(lane(view.lanes, "operation").score, { green: 2, built: 5, partly: 2, red: 0, notNeeded: 0, needed: 9 });
  equal(view.illustrative, true);
});

test("threads that had a card before are listed once, without the current one", () => {
  const c = cardOf(join(grid, moved).lanes, "error.telemetry");
  equal(c.thread?.id, "codex-plugged-in");
  deepEqual(c.hadIt.map((t) => t.id), ["m1-lead"]);
});

test("the climb starts at the grid's baseline and moves with each event", () => {
  const times = climbTimes(moved);
  equal(times.length, 7);
  const lanes = climb(grid, moved, times);
  deepEqual(lane(lanes, "operation").points.map((p) => p.score.green), [0, 0, 1, 2, 2, 2, 2, 2]);
  deepEqual(lane(lanes, "visibility").points.map((p) => p.score.built), [3, 3, 3, 3, 3, 3, 5, 5]);
  equal(lane(lanes, "operation").points[0]!.at, grid.asOf);
});

test("what changed lists moves after a time, newest first, with the state each came from", () => {
  const changes = changedSince(grid, moved, "2026-11-19T12:00:00Z");
  deepEqual(changes.map((c) => c.cell), ["error.telemetry", "visibility.api", "visibility.sdk", "event.telemetry"]);
  deepEqual(changes.map((c) => c.from), ["partly", "partly", "red", "partly"]);
});

test("filters by state, thread and output", () => {
  const cards = join(grid, moved).lanes.flatMap((l) => l.cards);
  equal(cards.filter((c) => matches(c, { states: ["red"] })).length, 35);
  equal(cards.filter((c) => matches(c, { thread: "codex-plugged-in" })).length, 1);
  equal(cards.filter((c) => matches(c, { output: "mcp", states: ["red"] })).length, 6);
});

test("roles come from cellRole: 102 carry, 4 absence checks, 20 not needed; 14 red ones are proposed grey", () => {
  const all = join(grid, board).lanes.flatMap((l) => l.cards);
  const count = (r: string) => all.filter((c) => c.role === r).length;
  deepEqual([count("carries"), count("absence"), count("not-needed")], [102, 4, 20]);
  deepEqual(all.filter((c) => c.role === "absence").map((c) => c.cell.id).sort(), ["step.api", "step.cli", "step.mcp", "step.sdk"]);
  const grey = all.filter((c) => c.proposedNotNeeded);
  equal(grey.length, 14);
  equal(grey.every((c) => c.state === "red" && c.role === "not-needed" && c.because !== null), true);
});
