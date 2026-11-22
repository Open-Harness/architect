// M1.49: every span a defect passes through carries its `error.tag`, so that a reader can tell the step that carried a call's failure from a step that died and
// was recovered. Run through the real wrapper: a handler that dies inside a step, and a store that dies at the commit.
import { Effect, Exit, Layer, Tracer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
import { Handlers } from "./service.ts";
import type { Handler } from "./types.ts";

const Thing = Blueprint.thing({ description: "A thing.", fields: { id: Blueprint.id("thg") } });
const op = Blueprint.operation(Thing, {
  description: "Do it.", payload: {}, answer: { thing: Thing.fields.id }, allowed: [Blueprint.signedIn], steps: { record: Blueprint.step.database() },
});
class Fault extends Error { readonly _tag = "LedgerUnreachable"; }
const ada = { kind: "person", person: "per_ada" } as const;

const run = async (handler: Handler<typeof op>, commitDies = false) => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const base = storeMemory();
  const dying = Layer.effect(Store, Effect.gen(function* () { const s = yield* Store; return { ...s, commit: () => Effect.die(new Fault("the commit is unreachable")) }; })).pipe(Layer.provide(base.layer));
  const layer = Layer.mergeAll(BusyLive, Layer.succeed(Tracer.Tracer, tracer), commitDies ? Layer.provideMerge(dying, base.layer) : base.layer);
  const served = Handlers.serve({ name: "thing.do", operation: op, handler });
  const exit = await Effect.runPromiseExit(Effect.provide(served.call({}, ada), layer));
  return { exit, tag: (name: string) => spans.find((s) => s.name === name)?.attributes.get("error.tag") };
};

describe("error.tag on the spans a defect passes through", () => {
  it("a die inside a step: the step's span and the attempt's span both carry the tag", async () => {
    const r = await run((_p, { steps }) => steps.record(Effect.die(new Fault("the record failed"))));
    expect(Exit.isFailure(r.exit)).toBe(true);
    expect(r.tag("thing.do.record")).toBe("LedgerUnreachable");
    expect(r.tag("thing.do")).toBe("LedgerUnreachable");
  });

  it("a die at the commit: the commit's span and the attempt's span both carry the tag", async () => {
    const r = await run((_p, { steps }) => steps.record(Effect.succeed({ thing: "thg_1" as never })), true);
    expect(Exit.isFailure(r.exit)).toBe(true);
    expect(r.tag("thing.do.commit")).toBe("LedgerUnreachable");
    expect(r.tag("thing.do")).toBe("LedgerUnreachable");
    expect(r.tag("thing.do.record"), "the step that finished is not tagged").toBeUndefined();
  });
});
