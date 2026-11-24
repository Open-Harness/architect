// Check 26 (#935, from #756): an eval the main agent let run out of time is `unavailable`, and it keeps covering its triggers until a
// person reevaluates them (`trigger.reevaluate`, design/goals/17-superagent.md, the Trigger row). The call is Goal 16's lead's, on #935,
// under CX-takeover. So: a pass after the timeout makes no eval for those triggers, nor does the pass after it; a trigger that arrives
// later on the same thread is new and gets an eval as usual; after `trigger.reevaluate` a pass leaves exactly one live eval covering the
// trigger. `eval.due` and `trigger.reevaluate` are served as the app serves them, over the memory store with the eval's own rules.
// CONTROLS (proved by hand on #935's pull request): `due.ts` as #756 wrote it (unavailable evals left out of `covered`) fails the first
// two; a `due.ts` that counts an unavailable eval as running fails the new trigger; the blank `reevaluate` fails the last. Dropping only
// the `unavailable` filter is not enough: the eval a pass expires is not `standing`, so `covered` must read every eval.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Clock, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { BusyLive, Handlers, Store, invariantsIn, storeMemory, type Instance } from "@orthograph/language-effect";
import { superagent as app } from "./app.ts";

const intake = join(app, "plugins/intake");
const load = async <A>(rel: string) => (await import(/* @vite-ignore */ pathToFileURL(join(intake, rel)).href)) as A;

const superagent = "sag_one";
const system = { kind: "system" } as const;
/** A signed-in person: `trigger.reevaluate` is a person's move. */
const ann = { kind: "person", person: "per_ann", via: "session" } as const;
const trigger = (id: string): Instance => ({ id, superagent, source: "slack", event: `Ev_${id}`, thread: "C1:1", kind: "mention", text: "x", channel: {} });
const thread: Instance = { id: "thr_0001", superagent, source: "slack", key: "C1:1", channel: {}, state: "idle" };
const owner: Instance = { id: superagent, name: "n", purpose: "p", connections: [], playbook: {}, slots: 2n, main: "agt_1", pausedFor: 0n, passGen: 0n, state: "live" };

const world = async () => {
  const [{ Eval }, { Trigger }, { Thread }, { Superagent }, rules, due, dueDecl, reevaluate, reevaluateDecl] = await Promise.all([
    load<{ Eval: unknown }>("blueprint/things/eval/thing.ts"),
    load<{ Trigger: unknown }>("blueprint/things/trigger/thing.ts"),
    load<{ Thread: unknown }>("blueprint/things/thread/thing.ts"),
    import(/* @vite-ignore */ pathToFileURL(join(app, "plugins/superagent/blueprint/things/superagent/thing.ts")).href) as Promise<{ Superagent: unknown }>,
    load<Record<string, unknown>>("blueprint/things/eval/invariants.ts"),
    load<{ default: unknown }>("src/eval/due.ts"),
    load<{ default: unknown }>("blueprint/things/eval/verbs/due.ts"),
    load<{ default: unknown }>("src/trigger/reevaluate.ts"),
    load<{ default: unknown }>("blueprint/things/trigger/verbs/reevaluate.ts"),
  ]);
  const at = BigInt(await Effect.runPromise(Clock.currentTimeMillis)) - 700_000n;
  const told: Instance = { id: "evl_old", superagent, thread: "thr_0001", triggers: ["trg_0001"], activeAtStart: 0n, timeoutMs: 600_000n, deliveredAt: at, state: "delivered" };
  const memory = storeMemory([[Superagent, owner], [Thread, thread], [Trigger, trigger("trg_0001")], [Eval, told]] as never, invariantsIn("eval", rules as never));
  const layer = Layer.mergeAll(BusyLive, memory.layer);
  const serve = (name: string, operation: unknown, handler: unknown, payload: unknown, who: unknown = system) =>
    Effect.runPromise((Handlers.serve({ name, operation: operation as never, handler: handler as never }).run(payload as never, who as never) as unknown as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(layer)));
  const list = (thing: unknown) => Effect.runPromise(Effect.flatMap(Store, (s) => s.list({ thing: thing as never, where: {}, state: undefined, order: "oldest", limit: 50, after: undefined })).pipe(Effect.provide(layer))).then((p) => p.items);
  return {
    pass: () => serve("eval.due", dueDecl.default, due.default, { superagent }),
    reevaluate: (id: string) => serve("trigger.reevaluate", reevaluateDecl.default, reevaluate.default, { trigger: id }, ann),
    arrive: (id: string) => Effect.runPromise(Effect.flatMap(Store, (s) => s.commit({ writes: [{ kind: "insert", thing: Trigger as never, fields: trigger(id), state: "stored" }], entries: [] })).pipe(Effect.provide(layer))),
    evals: () => list(Eval),
  };
};

/** The evals other than the expired one that cover `id`, and their states. */
const covering = (evals: ReadonlyArray<Instance>, id: string) => evals.filter((e) => e["id"] !== "evl_old" && (e["triggers"] as ReadonlyArray<string>).includes(id)).map((e) => String(e.state));

describe("26 an unavailable eval waits for a person", () => {
  it("the pass after the timeout gives the eval up, and neither it nor the next makes a new eval for its triggers", async () => {
    const w = await world();
    await w.pass();
    const after = await w.evals();
    expect(after.find((e) => e["id"] === "evl_old")?.state, "the expired eval").toBe("unavailable");
    expect(covering(after, "trg_0001"), "an eval made by the pass that expired it").toEqual([]);
    await w.pass();
    expect(covering(await w.evals(), "trg_0001"), "an eval made by the pass after").toEqual([]);
  });

  it("a trigger that arrives afterwards on the same thread is new: the next pass makes one eval for it alone", async () => {
    const w = await world();
    await w.pass();
    await w.arrive("trg_0002");
    await w.pass();
    const evals = (await w.evals()).filter((e) => e["id"] !== "evl_old");
    expect(evals.map((e) => [e["triggers"], String(e.state)])).toEqual([[["trg_0002"], "queued"]]);
  });

  it("after a person reevaluates the trigger, a pass leaves one live eval covering it, and the pass after makes no second", async () => {
    const w = await world();
    await w.pass();
    await w.reevaluate("trg_0001");
    await w.pass();
    await w.pass();
    expect(covering(await w.evals(), "trg_0001")).toEqual(["queued"]);
  });
});
