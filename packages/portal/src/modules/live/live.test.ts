import { Effect } from "effect";
import { expect, it } from "vitest";
import { Live } from "./service.ts";
import type { LiveLog, LiveSpan } from "./types.ts";

const span = (spanId: string, name: string, attrs: Record<string, unknown>, start: number, status = 1): LiveSpan => ({ spanId, name, attrs, status, start });
const signal = (spanId: string, step: string, phase: string, outcome?: string): LiveLog => ({ spanId, attrs: { step, phase, ...(outcome === undefined ? {} : { outcome }) } });
const view = (spans: ReadonlyArray<LiveSpan>, logs: ReadonlyArray<LiveLog>, journal: ReadonlyArray<{ event: string; subject: string }>) =>
  Effect.runPromise(Live.call({ source: { find: () => Effect.succeed({ spans, logs }) }, journal: () => Effect.succeed(journal) }, "t1"));

it("shows a step running from its start signal, before any span exists", async () => {
  const live = await view([], [signal("s1", "a.load", "start")], []);
  expect(live.steps).toEqual([{ name: "a.load", state: "running" }]);
  expect([live.commit, live.events]).toEqual([undefined, []]);
});

it("ends a step by its end signal, and lists steps in start order", async () => {
  const live = await view(
    [span("s1", "a.load", { "step.kind": "database" }, 1)],
    [signal("s1", "a.load", "start"), signal("s1", "a.load", "end", "ok"), signal("s2", "a.record", "start")],
    [],
  );
  expect(live.steps).toEqual([{ name: "a.load", state: "ended", outcome: "ok" }, { name: "a.record", state: "running" }]);
});

it("shows a step with a span but no signal, ended by its status", async () => {
  const live = await view([span("s1", "a.load", { "step.kind": "call" }, 1, 2)], [], []);
  expect(live.steps).toEqual([{ name: "a.load", state: "ended", outcome: "error" }]);
});

it("shows the commit once its span ended, and the journal's events only with a committed commit", async () => {
  const commit = span("c1", "a.commit", { "step.kind": "commit", "commit.outcome": "committed", "commit.writes": 1, "commit.entries": 1 }, 3);
  const journal = [{ event: "BeaconLit", subject: "bcn_1" }];
  const done = await view([commit], [], journal);
  expect(done.steps).toEqual([]);
  expect(done.commit).toEqual({ outcome: "committed", writes: 1, entries: 1 });
  expect(done.events).toEqual([{ event: "BeaconLit", subject: "bcn_1", commit: { outcome: "committed", writes: 1, entries: 1 } }]);
  expect((await view([], [], journal)).events, "no commit span yet, so no event").toEqual([]);
  const conflict = span("c2", "a.commit", { "step.kind": "commit", "commit.outcome": "conflict", "commit.writes": 1, "commit.entries": 1 }, 3);
  expect((await view([conflict], [], journal)).events, "a conflict wrote nothing").toEqual([]);
});

it("after a conflict the commit that committed decides", async () => {
  const first = span("c1", "a.commit", { "step.kind": "commit", "commit.outcome": "conflict" }, 1);
  const second = span("c2", "a.commit", { "step.kind": "commit", "commit.outcome": "committed", "commit.entries": 2 }, 2);
  expect((await view([first, second], [], [])).commit).toEqual({ outcome: "committed", writes: 0, entries: 2 });
});

it("a trace the source has none of is an empty call", async () => {
  const live = await Effect.runPromise(Live.call({ source: { find: () => Effect.succeed(undefined) }, journal: () => Effect.succeed([]) }, "t9"));
  expect(live).toEqual({ trace: "t9", steps: [], commit: undefined, events: [] });
});
