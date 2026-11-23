// G4 (S-04), Codex P2 on #118: the Records a handler is actually given is the unit's, wrapped by `logs.watching` (service.ts), so
// that wrapper must carry `findBy` too: a lookup through it finds the holder, and what it found is learned for the log's
// redaction like any other read. Written by the checks author; the builder never edits this file.
// SPELLING: respelled at ST1.20 from G4's `unique` property and `findBy(Handle, "name", value)` onto G5's rule and `findBy(rule, value)`.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
import { recordingLogs } from "./decided.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
});
const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed] });
const rules = [{ name: "handle.oneHolderPerName", rule: oneHolderPerName }];

describe("the Records a handler gets (wrapped by logs.watching)", () => {
  it("has a working findBy: the holder in scope, undefined for a free name, and the call's own insert", async () => {
    const memory = storeMemory([[Handle, { id: "hdl_1", name: "ada", state: "claimed" }]], rules);
    const seen = await Effect.runPromise(Effect.gen(function* () {
      const unit = yield* Unit.make(yield* Store, rules);
      const logs = yield* recordingLogs({}, {});
      const records = logs.watching(unit.records);
      const held = yield* records.findBy(oneHolderPerName, "ada");
      const free = yield* records.findBy(oneHolderPerName, "grace");
      yield* records.insert(Handle, { id: "hdl_2" as never, name: "grace" }, "claimed");
      return { held, free, own: yield* records.findBy(oneHolderPerName, "grace") };
    }).pipe(Effect.provide(memory.layer)));
    expect(seen.held).toMatchObject({ id: "hdl_1", name: "ada" });
    expect(seen.free).toBeUndefined();
    expect(seen.own).toMatchObject({ id: "hdl_2", name: "grace" });
  });
});
