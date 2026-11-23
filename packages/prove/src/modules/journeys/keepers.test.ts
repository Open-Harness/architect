import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { keepersIn } from "./internal/keepers.ts";

describe("the keeper in a journey", () => {
  it("is found in the journey's own cast and in a starting world's it begins from", () => {
    const names = ["aaron", "keeper", "clock"];
    expect([...keepersIn(names, [{ aaron: Blueprint.anyone, keeper: Blueprint.keeper }])]).toEqual(["keeper"]);
    expect([...keepersIn(names, [{ aaron: Blueprint.anyone }, { keeper: Blueprint.keeper }])]).toEqual(["keeper"]);
    expect([...keepersIn(names, [{ aaron: Blueprint.anyone }, { clock: Blueprint.signedIn }])]).toEqual([]);
  });

  it("follows the cast the run resolves: the later declaration wins, so a name recast as someone signed in is no keeper", () => {
    const names = ["keeper", "aaron"];
    // a starting world casts `keeper`, a descendant world or the journey recasts it as a person
    expect([...keepersIn(names, [{ keeper: Blueprint.keeper }, { keeper: Blueprint.signedIn }])]).toEqual([]);
    expect([...keepersIn(names, [{ keeper: Blueprint.keeper }, { aaron: Blueprint.anyone }, { keeper: Blueprint.anyone }])]).toEqual([]);
    // and the other way round: a person recast as the keeper is the keeper
    expect([...keepersIn(names, [{ keeper: Blueprint.signedIn }, { keeper: Blueprint.keeper }])]).toEqual(["keeper"]);
  });
});
