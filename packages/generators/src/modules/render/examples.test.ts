// W2: an operation's worked examples, from a small model made for the purpose: a role cast, a refusal with fields, a reference at depth,
// a pattern and a step that checks nothing. Nothing is run, and no value the model does not hold appears.
import { describe, expect, it } from "vitest";
import type { Model, OperationModel } from "@orthograph/compiler";
import { workedExamples } from "./internal/examples.ts";

const op = { name: "thing.act", thing: "thing", verb: "act" } as unknown as OperationModel;
const other = { name: "thing.other", thing: "thing", verb: "other" };
const model = {
  refusals: { Gone: "TH-001", NotAllowed: "AR-001" },
  things: { thing: { machine: { notFrom: { error: "ThingNotFrom" } } } },
  journeys: {
    j: {
      name: "a thing is acted on",
      starts: "ready",
      cast: { ann: { kind: "role", role: "owner" }, sam: { kind: "signed-in" }, vic: { kind: "anyone" } },
      steps: [
        { title: "ann acts", call: { actor: "ann", operation: "thing.act", payload: { count: 2, target: { ref: ["world", "lastLink"] } }, request: "key-1" }, checks: [{ kind: "expect-equal", value: ["x", { ref: ["world", "items", "first"] }, true] }] },
        { title: "sam is refused", call: { actor: "sam", operation: "thing.act", payload: {} }, checks: [{ kind: "refuses", error: "Gone", fields: { state: "removed" } }] },
        { title: "vic reads another", call: { actor: "vic", operation: "thing.other", payload: {} }, checks: [] },
        { title: "ann makes an id", call: { actor: "ann", operation: "thing.act", payload: {} }, checks: [{ kind: "expect", match: "^thg_[0-9a-z]+$" }] },
        { title: "ann again", call: { actor: "ann", operation: "thing.act", payload: {} }, checks: [] },
      ],
    },
    none: { name: "calls only the other", starts: null, cast: {}, steps: [{ title: "x", call: { actor: "vic", operation: other.name, payload: {} }, checks: [] }] },
  },
} as unknown as Model;

describe("workedExamples", () => {
  const text = workedExamples(model, op).join("\n");

  it("has one entry for each journey that calls the operation, naming its starting world, and none for one that does not", () => {
    expect(text).toContain("## Worked examples");
    expect(text).toContain("### a thing is acted on");
    expect(text).toContain("Starts from the world `ready`.");
    expect(text).not.toContain("calls only the other");
    expect(workedExamples(model, other as unknown as OperationModel).join("\n")).toContain("Starts from an empty world.");
  });

  it("lists only the steps that call this operation, in order", () => {
    expect(text).not.toContain("vic reads another");
    expect(text.indexOf("ann acts")).toBeLessThan(text.indexOf("sam is refused"));
    expect(text.indexOf("sam is refused")).toBeLessThan(text.indexOf("ann makes an id"));
  });

  it("names the caller and, for a role, the role; sends every field and the request key", () => {
    expect(text).toContain("`ann` (role owner)");
    expect(text).toContain("`sam` (signed in)");
    expect(text).toContain("sends count 2, target the world's lastLink, with the request key `key-1`");
  });

  it("shows a refusal by name and code with its checked fields, a nested reference in words, a pattern in code, and an unchecked step as answered", () => {
    expect(text).toContain("is refused with Gone, TH-001, carrying state `removed`");
    expect(text).toContain("gets back [`x`, the world's items first, true]");
    expect(text).toContain("gets back an answer matching `^thg_[0-9a-z]+$`");
    expect(text).toMatch(/ann again\.\*\* .* is answered\./);
  });

  it("writes nothing for an operation no journey calls", () => {
    expect(workedExamples(model, { name: "thing.none" } as unknown as OperationModel)).toEqual([]);
  });
});
