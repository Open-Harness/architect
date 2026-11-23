import { Effect, Logger, Tracer } from "effect";
import { CurrentLogAnnotations } from "effect/References";
import { expect, it } from "vitest";
import { signalled } from "./signal.ts";
import { spanned } from "./span.ts";

/** Run `work` as a step, returning its signals as `[step, phase, outcome, spanId]` and the step span's id. */
const run = async (work: Effect.Effect<unknown, unknown>) => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const span = new Tracer.NativeSpan(options); spans.push(span); return span; } });
  const seen: Array<readonly [unknown, unknown, unknown, string | undefined]> = [];
  const logger = Logger.make(({ fiber }) => {
    const a = fiber.getRef(CurrentLogAnnotations);
    seen.push([a["step"], a["phase"], a["outcome"], fiber.cache.span?.spanId]);
  });
  await Effect.runPromiseExit(spanned("op.load", { "step.kind": "database" })(signalled("op.load")(work)).pipe(
    Effect.provideService(Tracer.Tracer, tracer),
    Effect.provide(Logger.layer([logger])),
  ));
  return { seen, id: spans[0]?.spanId };
};

it("signals a step's start and end inside its own span, ok when it finishes", async () => {
  const { seen, id } = await run(Effect.void);
  expect(seen).toEqual([["op.load", "start", undefined, id], ["op.load", "end", "ok", id]]);
});

it("ends a refused step ok, as its span ends, and a defect as error", async () => {
  expect((await run(Effect.fail("Nope"))).seen.map((s) => s[2])).toEqual([undefined, "ok"]);
  expect((await run(Effect.die(new Error("boom")))).seen.map((s) => s[2])).toEqual([undefined, "error"]);
});
