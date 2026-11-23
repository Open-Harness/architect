import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";

const Handle = Blueprint.thing({ description: "A name.", code: "HD", fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) } });
const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}

describe("Blueprint.invariant.unique", () => {
  it("keeps the key, the scope, the refusal and the words as written", () => {
    const rule = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken, description: "x" });
    expect(rule).toMatchObject({ kind: "invariant", form: "unique", fields: [Handle.fields.name], while: [machine.states.claimed], refuse: HandleTaken, description: "x" });
  });
  it("takes a tuple, and no options: every state, no refusal", () => {
    const rule = Blueprint.invariant.unique([Handle.fields.owner, Handle.fields.name]);
    expect(rule.fields.map((f) => f.key)).toEqual(["owner", "name"]);
    expect([rule.while, rule.refuse, rule.description]).toEqual([undefined, undefined, undefined]);
  });
  it("gives a machine its states as references, by name", () => {
    expect(machine.states.claimed).toMatchObject({ kind: "state", key: "claimed", machine });
    expect(Object.keys(machine.states)).toEqual(["claimed", "released"]);
  });
});
