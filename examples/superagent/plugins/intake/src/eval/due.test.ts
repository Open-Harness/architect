import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Records, Store, Unit, storeMemory, type Instance } from "@orthograph/language-effect";
import due from "./due.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";
import { Thread } from "../../blueprint/things/thread/thing.ts";
import { Trigger } from "../../blueprint/things/trigger/thing.ts";

const superagent = "sag_one";
const pad = (n: number) => String(n).padStart(4, "0");
const trigger = (n: number): Instance => ({ id: `trg_${pad(n)}`, superagent, source: "slack", event: `Ev${n}`, thread: `C1:${n}`, kind: "mention", text: "x", channel: {} });
const thread = (n: number): Instance => ({ id: `thr_${pad(n)}`, superagent, source: "slack", key: `C1:${n}`, channel: {}, state: "idle" });
const decided = (n: number): Instance => ({ id: `evl_${pad(n)}`, superagent, thread: `thr_${pad(n)}`, triggers: [`trg_${pad(n)}`], activeAtStart: 0n, timeoutMs: 600_000n, state: "decided" });

type Row = readonly [typeof Eval | typeof Thread | typeof Trigger, Instance];

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
