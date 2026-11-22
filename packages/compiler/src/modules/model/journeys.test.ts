import { Blueprint, type Call } from "orthograph";
import { describe, expect, it } from "vitest";
import { stepBlanks } from "./internal/journeys.ts";

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
