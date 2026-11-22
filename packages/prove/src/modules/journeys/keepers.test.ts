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
});
