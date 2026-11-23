import { Blueprint, type Call } from "orthograph";
import { describe, expect, it } from "vitest";
import { castClashes, stepBlanks, storiesOf } from "./internal/journeys.ts";

const call = (due: unknown): Call => ({ kind: "call", actor: "keeper", operation: {} as never, payload: { membership: "mbr_1" }, request: undefined, due: due as never });

describe("a journey step's blanks", () => {
  it("count the keeper's due instant: a step whose only blank is the due is unfinished", () => {
    expect(stepBlanks({ call: call(Blueprint.todo("the instant membership.renew was due")), checks: [] })).toEqual(["the instant membership.renew was due"]);
  });

  it("find nothing in a step that is whole, with or without a due instant", () => {
    expect(stepBlanks({ call: call("2027-02-10T09:00:00.000Z"), checks: [] })).toEqual([]);
    expect(stepBlanks({ call: call(undefined), checks: [] })).toEqual([]);
  });
});

describe("a cast member the script's own words would hide", () => {
  const cast = { aaron: Blueprint.anyone, clock: Blueprint.anyone };

  it("is refused in a journey and in a starting world, naming the member and what it clashes with", () => {
    expect(castClashes(cast, "journeys/a.ts", 'the journey "a month"')).toEqual([
      "journeys/a.ts: the journey \"a month\" casts a member `clock`, which takes a name the script already uses for the world's clock; rename it",
    ]);
    expect(castClashes({ world: Blueprint.anyone, last: Blueprint.anyone, step: Blueprint.anyone }, "w.ts", 'the starting world "w"')).toHaveLength(3);
    expect(castClashes({ aaron: Blueprint.anyone, keeper: Blueprint.keeper }, "w.ts", "x")).toEqual([]);
  });

  it("stops the compiler: a journey and a starting world that cast `clock` are each a problem", () => {
    const op = { kind: "operation" } as never;
    const layout = {
      things: new Map(),
      journeys: new Map([["journeys/a.ts", { declaration: Blueprint.journey("a month", { cast, steps: () => [] }), sourceHash: undefined }]]),
      startingWorlds: new Map([["w", { file: "starting-worlds/w.ts", declaration: Blueprint.startingWorld("w", { cast, makes: () => [], gives: () => ({}) }), sourceHash: undefined }]]),
    } as never;
    const problems: Array<string> = [];
    storiesOf(layout, { op } as never, () => ({ kind: "anyone" }), problems);
    expect(problems).toHaveLength(2);
    expect(problems.every((p) => p.includes("`clock`"))).toBe(true);
  });
});
