import { Effect, Tracer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Device } from "./service.ts";
import type { Handler } from "./types.ts";

const Receipt = Blueprint.thing({ description: "A stamped text.", fields: { id: Blueprint.id("rcp") } });
const stamp = Blueprint.operation(Receipt, {
  description: "Stamp a text.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { stamp: Blueprint.text({ max: 64 }) },
  steps: { prepare: Blueprint.step.wait(), seal: Blueprint.step.wait() },
  allowed: [Blueprint.anyone],
  runs: "client",
});
const handler: Handler<typeof stamp> = ({ text }, { steps }) =>
  Effect.gen(function* () {
    const prepared = yield* steps.prepare(Effect.succeed(text.trim()));
    return { stamp: yield* steps.seal(Effect.succeed(`ok:${prepared}`)) };
  });

describe("Device.serve", () => {
  it("runs the handler in this process, with the operation's span and a span for each step", async () => {
    const spans: Array<Tracer.NativeSpan> = [];
    const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
    const served = Device.serve({ name: "receipt.stamp", operation: stamp, handler });
    const answer = await Effect.runPromise(served.run({ text: " hi " }, { otlp: undefined, service: "test" }).pipe(Effect.withTracer(tracer)));
    expect(answer).toEqual({ stamp: "ok:hi" });
    const root = spans.find((s) => s.name === "receipt.stamp")!;
    expect(root.attributes.get("operation")).toBe("receipt.stamp");
    const children = spans.filter((s) => s.parent._tag === "Some" && s.parent.value.spanId === root.spanId).map((s) => [s.name, s.attributes.get("step.kind")]);
    expect(children).toEqual([["receipt.stamp.prepare", "wait"], ["receipt.stamp.seal", "wait"]]);
  });
});
