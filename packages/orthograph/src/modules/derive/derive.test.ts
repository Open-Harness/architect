import { describe, expect, it } from "vitest";
import { Derives } from "./service.ts";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";

const Parent = Things.thing({ description: "A parent.", fields: { id: Values.id("par"), title: Values.text() } });
const Child = Things.thing({ description: "A child.", fields: { id: Values.id("chi"), parent: Parent.fields.id } });

describe("derive", () => {
  it("a look names the thing, the field that holds the root's id, how many, and the state", () => {
    const newest = Derives.newest(Child, { by: Child.fields.parent, state: "open" });
    expect(newest).toMatchObject({ kind: "look", take: "newest", max: 1, state: "open" });
    expect(Derives.all(Child, { by: Child.fields.parent, max: 7 })).toMatchObject({ take: "all", max: 7 });
  });

  it("a derive keeps its looks, what it adds and its function", () => {
    const is = () => ({ verdict: "fine" });
    const d = Derives.derive(Parent, { looks: { child: Derives.newest(Child, { by: Child.fields.parent }) }, adds: { verdict: Values.text() }, is });
    expect(d.kind).toBe("derive");
    expect(Object.keys(d.looks)).toEqual(["child"]);
    expect(d.is).toBe(is);
  });

  it("a problem says which field counts the failures, and when it shows", () => {
    const p = Derives.problem(Child, { kind: "channel", of: Child.fields.parent, name: Child.fields.id, failures: Child.fields.id, after: 3 });
    expect(p).toMatchObject({ kind: "problem", of: "channel", after: 3 });
  });
});
