// How a call step runs, against the real Busy and held Promises. Each test plants the failure it names.
import { Cause, Context, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { BusyLive } from "#modules/work/service.js";
import { Busy } from "#modules/work/types.js";
import { BlankReached } from "#modules/handler/types.js";
import { Handlers } from "#modules/handler/service.js";
import { Calls } from "./service.ts";
import type { Callable } from "./types.ts";

class PriceUnavailable extends Blueprint.error({}, { exit: 76 }) {}
class NotDeclared extends Blueprint.error({}, { exit: 77 }) {}
class Setting extends Context.Service<Setting, { readonly value: string }>()("test/Setting") {}

const run = (mode: "promise" | "effect", callable: Callable, layer?: Layer.Layer<any, any, any>) =>
  Calls.runner({ label: "probe.quote.price", step: { call: Blueprint.call({ mode, errors: [PriceUnavailable] }) }, wiring: { run: callable, ...(layer ? { layer } : {}) } });
const refuse = (_failure: unknown) => new PriceUnavailable({});
const exited = <A, E>(work: Effect.Effect<A, E, Busy>) => Effect.runPromise(Effect.exit(work).pipe(Effect.provide(BusyLive)));
const defect = <A, E>(exit: Exit.Exit<A, E>) => (Exit.isFailure(exit) && Cause.hasDies(exit.cause) ? Cause.squash(exit.cause) : undefined);

describe("call steps: Promise mode", () => {
  it("calls lazily, answers what the Promise settles to, and a rejection or a synchronous throw reach the one mapping as unknown", async () => {
    let called = 0;
    const quote = (mode: string): Promise<string> => {
      called += 1;
      if (mode === "throw") throw { marker: "foreign-private-canary" };
      return mode === "reject" ? Promise.reject({ marker: "foreign-private-canary" }) : Promise.resolve("ok");
    };
    const step = run("promise", quote);
    const seen: Array<unknown> = [];
    const mapped = (failure: unknown) => { seen.push(failure); return new PriceUnavailable({}); };
    const lazy = step(["ok"], refuse);
    expect(called).toBe(0);
    expect(Exit.isSuccess(await exited(lazy))).toBe(true);
    for (const mode of ["reject", "throw"]) {
      const exit = await exited(step([mode], mapped));
      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(PriceUnavailable);
    }
    expect(seen).toEqual([{ marker: "foreign-private-canary" }, { marker: "foreign-private-canary" }]);
  });

  it("the raw wait is uninterruptible and counted: interrupting its fiber waits for the Promise, and quiet follows the settle", async () => {
    let release = () => {};
    const held = new Promise<string>((resolve) => { release = () => resolve("released"); });
    const step = run("promise", () => held);
    const program = Effect.gen(function* () {
      const busy = yield* Busy;
      const work = yield* Effect.forkChild(busy.counted(step([], refuse)));
      yield* Effect.yieldNow;
      const interrupting = yield* Effect.forkChild(Fiber.interrupt(work));
      for (let i = 0; i < 20; i += 1) yield* Effect.yieldNow;
      const during = yield* busy.count;
      release();
      yield* Fiber.join(interrupting);
      yield* busy.quiet;
      return { during, after: yield* busy.count };
    });
    expect(await Effect.runPromise(program.pipe(Effect.provide(BusyLive)))).toEqual({ during: 1, after: 0 });
  });
});

describe("call steps: Effect mode", () => {
  const layer = Layer.succeed(Setting, { value: "configured" });
  const quote = (mode: string) => Effect.gen(function* () {
    const setting = yield* Setting;
    if (mode === "fail") return yield* Effect.fail({ marker: "foreign-private-canary" });
    if (mode === "die") return yield* Effect.die(new Error("foreign defect"));
    if (mode === "interrupt") return yield* Effect.interrupt;
    return setting.value;
  });

  it("keeps the callable's services through the adapter's layer, and maps only the typed failure", async () => {
    const step = run("effect", quote, layer);
    const ok = await exited(step(["ok"], refuse));
    expect(Exit.isSuccess(ok) && ok.value).toBe("configured");
    const failed = await exited(step(["fail"], (failure) => (failure as { marker: string }).marker === "foreign-private-canary" ? new PriceUnavailable({}) : new NotDeclared({})));
    expect(Exit.isFailure(failed) && Cause.squash(failed.cause)).toBeInstanceOf(PriceUnavailable);
    const died = await exited(step(["die"], refuse));
    expect(defect(died)).toMatchObject({ message: "foreign defect" });
    const interrupted = await exited(step(["interrupt"], refuse));
    expect(Exit.isFailure(interrupted) && Cause.hasInterrupts(interrupted.cause)).toBe(true);
    expect(Exit.isFailure(interrupted) && Cause.hasFails(interrupted.cause)).toBe(false);
  });
});

describe("call steps: the one mapping", () => {
  const rejecting = run("promise", () => Promise.reject({ marker: "foreign-private-canary" }));

  it("a mapper that throws, one that gives something undeclared, and a blank are defects, never a refusal", async () => {
    const threw = defect(await exited(rejecting([], () => { throw new Error("authored mapper defect"); })));
    expect(threw).toMatchObject({ message: "authored mapper defect" });
    const undeclared = defect(await exited(rejecting([], () => new NotDeclared({}))));
    expect(String(undeclared)).toMatch(/mapped to something the call does not declare/);
    expect(String(undeclared)).not.toContain("foreign-private-canary");
    const unwritten = defect(await exited(rejecting([], Handlers.blank("map it", "failure"))));
    expect(unwritten).toBeInstanceOf(BlankReached);
  });

  it("a call nothing is wired to is a defect", async () => {
    const unwired = Calls.runner({ label: "probe.quote.price", step: { call: Blueprint.call({ errors: [PriceUnavailable] }) }, wiring: undefined });
    expect(String(defect(await exited(unwired([], refuse))))).toMatch(/nothing is wired/);
  });
});
