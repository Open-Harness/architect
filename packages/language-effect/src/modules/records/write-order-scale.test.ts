// S-19 follow-up: ordering and committing one call's writes costs time in proportion to the writes, not to the writes times the rows of the thing.
// Judged as a ratio on the same machine, not against a wall-clock bound: a shared CI runner took 1.7 s for a chain that takes 0.2 s on a laptop.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Tag = Blueprint.thing({
  description: "A name someone holds.",
  code: "TG",
  fields: { id: Blueprint.id("tag"), name: Blueprint.text({ max: 40 }) },
});
const machine = Blueprint.machine(Tag, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
const rules = [{ name: "tag.oneHolderPerName", rule: (Blueprint as any).invariant.unique(Tag.fields.name, { while: [machine.states.claimed] }) }];

/** Orders and commits a chain of `n` moves in memory: row i takes the name row i + 1 holds, so the chain is written from its far end back. */
const chain = (n: number) => {
  const memory = storeMemory(Array.from({ length: n }, (_, i) => [Tag, { id: `tag_${i}`, name: `n${i}`, state: "claimed" }] as const) as never, rules);
  const program = Effect.gen(function* () {
    const store = yield* Store;
    const unit = yield* Unit.make(store, rules);
    for (let i = 0; i < n; i++) yield* unit.records.update(Tag, `tag_${i}`, { name: `n${i + 1}` });
    const started = performance.now();
    const writes = yield* unit.writes;
    const outcome = yield* store.commit({ writes, entries: [] });
    return { outcome, ms: performance.now() - started, first: (writes[0] as { id: string }).id };
  });
  return Effect.runPromise(program.pipe(Effect.provide(memory.layer)) as Effect.Effect<{ outcome: string; ms: number; first: string }>);
};

/** The fastest of three runs, so one stall on a loaded machine does not decide it. */
const fastest = async (n: number) => {
  let best = Number.POSITIVE_INFINITY;
  for (let run = 0; run < 3; run++) {
    const { outcome, ms, first } = await chain(n);
    expect(outcome).toBe("committed");
    expect(first).toBe(`tag_${n - 1}`);
    best = Math.min(best, ms);
  }
  return best;
};

const SMALL = 400;
const LARGE = 3 * SMALL;

describe("a call writing many rows (S-19)", () => {
  // Three times the moves: linear work costs 3x, quadratic 9x, cubic 27x. Today it measures about 6.5x (5 ms and 31 ms on a laptop, steady over five runs);
  // the ordering before this change measured 24.6x (0.8 s and 20 s). 16x sits between quadratic and cubic on a log scale. The chains are kept small so
  // the old ordering fails in about a minute instead of hanging the job: its work is synchronous, so the test timeout cannot stop it.
  it(`a chain of ${LARGE} moves costs under 16 times a chain of ${SMALL}`, async () => {
    await chain(SMALL);
    const small = await fastest(SMALL);
    const large = await fastest(LARGE);
    expect(large / Math.max(small, 1), `${SMALL} moves: ${small.toFixed(1)} ms, ${LARGE} moves: ${large.toFixed(1)} ms`).toBeLessThan(16);
  }, 120_000);
});
