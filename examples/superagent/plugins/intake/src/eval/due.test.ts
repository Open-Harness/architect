import { Clock, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { BusyLive, Handlers, Records, Store, Unit, invariantsIn, storeMemory, type Instance } from "@orthograph/language-effect";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import due from "./due.ts";
import declaration from "../../blueprint/things/eval/verbs/due.ts";
import * as evalRules from "../../blueprint/things/eval/invariants.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";
import { Thread } from "../../blueprint/things/thread/thing.ts";
import { Trigger } from "../../blueprint/things/trigger/thing.ts";

const superagent = "sag_one";
const system = { kind: "system" } as const;
const pad = (n: number) => String(n).padStart(4, "0");
const trigger = (n: number): Instance => ({ id: `trg_${pad(n)}`, superagent, source: "slack", event: `Ev${n}`, thread: `C1:${n}`, kind: "mention", text: "x", channel: {} });
const thread = (n: number): Instance => ({ id: `thr_${pad(n)}`, superagent, source: "slack", key: `C1:${n}`, channel: {}, state: "idle" });
const decided = (n: number): Instance => ({ id: `evl_${pad(n)}`, superagent, thread: `thr_${pad(n)}`, triggers: [`trg_${pad(n)}`], activeAtStart: 0n, timeoutMs: 600_000n, state: "decided" });
const owner = (pausedFor: bigint, state = "live"): Instance => ({ id: superagent, name: "n", purpose: "p", connections: [], playbook: {}, slots: 2n, main: "agt_1", pausedFor, passGen: 0n, state });

type Row = readonly [typeof Eval | typeof Thread | typeof Trigger | typeof Superagent, Instance];

/** One pass of the eval clock over a store holding `rows`: how many evals it made. */
const pass = (rows: ReadonlyArray<Row>) => {
  const memory = storeMemory(rows as never);
  const program = Effect.gen(function* () {
    const unit = yield* Unit.make(yield* Store);
    const answer = yield* due({ superagent } as never, {} as never).pipe(Effect.provideService(Records, unit.records));
    return answer.started;
  });
  return Effect.runPromise(program.pipe(Effect.provide(memory.layer)));
};

describe("eval.due over more history than one page", () => {
  it("makes one eval for the one thread whose trigger no eval covers, among few threads", async () => {
    expect(await pass([[Trigger, trigger(1)], [Thread, thread(1)]])).toBe(1n);
  });

  it("still sees a new trigger after 1100 triggers that decided evals already cover (past the 1000 a pass once stopped at)", async () => {
    const old = Array.from({ length: 1100 }, (_, i) => i + 1);
    const rows: Array<Row> = [...old.flatMap((n): Array<Row> => [[Trigger, trigger(n)], [Thread, thread(n)], [Eval, decided(n)]]), [Trigger, trigger(1101)], [Thread, thread(1101)]];
    expect(await pass(rows)).toBe(1n);
  });
});

/** Serve `eval.due` over a store that holds the rule one live eval per thread, and read each eval back. */
const served = (rows: ReadonlyArray<Row>, handler: unknown = due) => {
  const memory = storeMemory(rows as never, invariantsIn("eval", evalRules));
  const layer = Layer.mergeAll(BusyLive, memory.layer);
  const run = () => Effect.runPromise((Handlers.serve({ name: "eval.due", operation: declaration, handler: handler as never }).run({ superagent } as never, system) as Effect.Effect<{ started: bigint }, unknown, never>).pipe(Effect.provide(layer)));
  const evals = () => Effect.runPromise(Effect.flatMap(Store, (s) => s.list({ thing: Eval, where: {}, state: undefined, order: "oldest", limit: 50, after: undefined })).pipe(Effect.provide(layer))).then((page) => page.items);
  return { run, evals };
};

describe("eval.due, served", () => {
  const delivered = (activeAt: bigint): Instance => ({ id: "evl_old", superagent, thread: "thr_0001", triggers: ["trg_0001"], activeAtStart: 0n, timeoutMs: 600_000n, deliveredAt: activeAt, state: "delivered" });
  const wall = () => Effect.runPromise(Clock.currentTimeMillis).then(BigInt);

  it("gives up on an eval the main agent let run past its time, on the superagent's active clock", async () => {
    const at = (await wall()) - 700_000n;
    const { run, evals } = served([[Superagent, owner(0n)], [Trigger, trigger(1)], [Thread, thread(1)], [Eval, delivered(at)]]);
    await run();
    expect((await evals()).find((e) => e["id"] === "evl_old")?.state).toBe("unavailable");
  });

  it("does not give up on an eval that spans a pause: the time paused is not the main agent's", async () => {
    // Delivered 700 s ago on the active clock, but 300 s of that the superagent was paused: 400 s of its 600 s have run.
    const at = (await wall()) - 700_000n;
    const { run, evals } = served([[Superagent, owner(300_000n)], [Trigger, trigger(1)], [Thread, thread(1)], [Eval, delivered(at)]]);
    expect(await run()).toEqual({ started: 0n });
    expect((await evals()).find((e) => e["id"] === "evl_old")?.state).toBe("delivered");
  });

  it("does not run an eval's clock while the superagent is paused", async () => {
    const at = (await wall()) - 700_000n;
    const paused = { ...owner(0n, "paused"), pausedAt: at + 100_000n };
    const { run, evals } = served([[Superagent, paused], [Trigger, trigger(1)], [Thread, thread(1)], [Eval, delivered(at)]]);
    await run();
    expect((await evals()).find((e) => e["id"] === "evl_old")?.state).toBe("delivered");
  });

  it("two passes that overlap make one eval for a thread: the one that loses runs again and makes nothing", async () => {
    let attempts = 0;
    // The first attempt sees a thread with nothing running and makes its eval; then the other pass commits its own, before this call's check runs.
    const racing = (payload: unknown, context: unknown) =>
      Effect.gen(function* () {
        attempts += 1;
        const answer = yield* (due as unknown as (p: unknown, c: unknown) => Effect.Effect<{ started: bigint }, never, Records | Store>)(payload, context);
        if (attempts === 1) {
          const rival = { kind: "insert" as const, thing: Eval, fields: { id: "evl_rival", superagent, thread: "thr_0001", triggers: ["trg_0001"], activeAtStart: 0n, timeoutMs: 600_000n }, state: "queued" };
          expect(yield* Effect.flatMap(Store, (s) => s.commit({ writes: [rival], entries: [] }))).toBe("committed");
        }
        return answer;
      });
    const raced = served([[Superagent, owner(0n)], [Trigger, trigger(1)], [Thread, thread(1)]], racing);
    expect(await raced.run()).toEqual({ started: 0n });
    expect(attempts).toBe(2);
    expect((await raced.evals()).map((e) => e["id"])).toEqual(["evl_rival"]);
  });
});
