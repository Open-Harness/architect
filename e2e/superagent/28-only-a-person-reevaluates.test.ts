// Check 28 (#953): `trigger.reevaluate` is a person's move (design/goals/17-superagent.md, the Trigger row: "`reevaluate` (person)";
// GOAL17-reevaluate-person). An agent acting as itself is refused `NotAllowed`, whoever's agent it is: another superagent's main agent,
// this superagent's own main agent (its move is `requeue`), and this superagent's ticket's executor. A refused call writes nothing, so
// the trigger stays covered by the eval that ran out of time and the next pass makes no eval for it. A person can still reevaluate,
// signed in by a session, a key or a device, on any superagent: the call takes that one trigger out of the expired eval and writes nothing
// else, and the next pass judges it alone. Scoping to a person of that superagent waits on slice 15's teams: nothing ties a person to a
// superagent before it. In the built model, as check 09 judges `proposal.approve`, the operation is not an agent's tool and is allowed to a
// signed-in person only, and the declaration the app serves says the same once its handler has loaded, so a refusal made inside the
// handler does not pass.
// `trigger.reevaluate` and `eval.due` are served as the app serves them, over the memory store with the eval's own rules, as check 26 does.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { admitsAgent } from "orthograph";
import { BusyLive, Handlers, Store, invariantsIn, storeMemory, type Instance } from "@orthograph/language-effect";
import { build, lazy, removeCopies, superagent as app } from "./app.ts";

const load = async <A>(rel: string) => (await import(/* @vite-ignore */ pathToFileURL(join(app, rel)).href)) as A;

const system = { kind: "system" } as const;

/** Agents, each acting as itself (K40 fix 3): `person` is the agent's id. */
const agents = {
  "another superagent's main agent": { kind: "agent", person: "agt_2", via: "agent" },
  "this superagent's own main agent": { kind: "agent", person: "agt_1", via: "agent" },
  "this superagent's executor": { kind: "agent", person: "agt_exec", via: "agent" },
} as const;
/** People, each by one way in, each reevaluating another trigger: two of `sag_one`'s expired eval, and `sag_two`'s one. */
const people = {
  "a person signed in by a session": { principal: { kind: "person", person: "per_ann", via: "session" }, trigger: "trg_0001", superagent: "sag_one", eval: "evl_old", other: ["trg_0003"] },
  "a person signed in by a key": { principal: { kind: "person", person: "per_bob", via: "key" }, trigger: "trg_0003", superagent: "sag_one", eval: "evl_old", other: ["trg_0001"] },
  "a person signed in on a device, on another superagent": { principal: { kind: "person", person: "per_cy", via: "device" }, trigger: "trg_0201", superagent: "sag_two", eval: "evl_two", other: [] },
} as const;

const trigger = (id: string, superagent = "sag_one", key = "C1:1"): Instance => ({ id, superagent, source: "slack", event: `Ev_${id}`, thread: key, kind: "mention", text: "x", channel: {} });
const thread = (id: string, superagent: string, key: string): Instance => ({ id, superagent, source: "slack", key, channel: {}, state: "idle" });
const sag = (id: string, main: string): Instance => ({ id, name: "n", purpose: "p", connections: [], playbook: {}, slots: 2n, main, pausedFor: 0n, passGen: 0n, state: "live" });
const ticket: Instance = { id: "tkt_0001", superagent: "sag_one", title: "t", agent: "agt_exec", seq: 0n, state: "open" };
/** An eval the main agent let run out of time: it holds its triggers until a person reevaluates one. */
const expired = (id: string, superagent: string, thr: string, triggers: ReadonlyArray<string>): Instance => ({ id, superagent, thread: thr, triggers, activeAtStart: 0n, timeoutMs: 600_000n, deliveredAt: 0n, state: "unavailable" });
const EXPIRED = new Set(["evl_old", "evl_two"]);

type Outcome = { readonly answer: unknown } | { readonly refused: string } | { readonly died: string };

const world = async () => {
  const [{ Eval }, { Trigger }, { Thread }, { Superagent }, { Ticket }, rules, due, dueDecl, reevaluate, reevaluateDecl] = await Promise.all([
    load<{ Eval: unknown }>("plugins/intake/blueprint/things/eval/thing.ts"),
    load<{ Trigger: unknown }>("plugins/intake/blueprint/things/trigger/thing.ts"),
    load<{ Thread: unknown }>("plugins/intake/blueprint/things/thread/thing.ts"),
    load<{ Superagent: unknown }>("plugins/superagent/blueprint/things/superagent/thing.ts"),
    load<{ Ticket: unknown }>("plugins/tickets/blueprint/things/ticket/thing.ts"),
    load<Record<string, unknown>>("plugins/intake/blueprint/things/eval/invariants.ts"),
    load<{ default: unknown }>("plugins/intake/src/eval/due.ts"),
    load<{ default: unknown }>("plugins/intake/blueprint/things/eval/verbs/due.ts"),
    load<{ default: unknown }>("plugins/intake/src/trigger/reevaluate.ts"),
    load<{ default: { readonly allowed: never } }>("plugins/intake/blueprint/things/trigger/verbs/reevaluate.ts"),
  ]);
  const memory = storeMemory(
    [
      [Superagent, sag("sag_one", "agt_1")], [Superagent, sag("sag_two", "agt_2")], [Ticket, ticket],
      [Thread, thread("thr_0001", "sag_one", "C1:1")], [Thread, thread("thr_0002", "sag_two", "C2:1")],
      [Trigger, trigger("trg_0001")], [Trigger, trigger("trg_0003")], [Trigger, trigger("trg_0201", "sag_two", "C2:1")],
      [Eval, expired("evl_old", "sag_one", "thr_0001", ["trg_0001", "trg_0003"])], [Eval, expired("evl_two", "sag_two", "thr_0002", ["trg_0201"])],
    ] as never,
    invariantsIn("eval", rules as never),
  );
  const layer = Layer.mergeAll(BusyLive, memory.layer);
  const serve = (name: string, operation: unknown, handler: unknown, payload: unknown, who: unknown) =>
    Handlers.serve({ name, operation: operation as never, handler: handler as never }).run(payload as never, who as never) as unknown as Effect.Effect<unknown, { readonly _tag?: string }, never>;
  const list = (thing: unknown) => Effect.runPromise(Effect.flatMap(Store, (s) => s.list({ thing: thing as never, where: {}, state: undefined, order: "oldest", limit: 50, after: undefined })).pipe(Effect.provide(layer))).then((p) => p.items);
  const things = { Superagent, Ticket, Thread, Trigger, Eval };
  return {
    allowed: reevaluateDecl.default.allowed as ReadonlyArray<unknown>,
    pass: (superagent: string) => Effect.runPromise(serve("eval.due", dueDecl.default, due.default, { superagent }, system).pipe(Effect.provide(layer))),
    /** What `trigger.reevaluate` came back with for `who`: its answer, the tag it was refused with, or the defect it died of. */
    reevaluate: (who: unknown, id = "trg_0001"): Promise<Outcome> =>
      Effect.runPromise(serve("trigger.reevaluate", reevaluateDecl.default, reevaluate.default, { trigger: id }, who).pipe(
        Effect.match({ onSuccess: (answer): Outcome => ({ answer }), onFailure: (e): Outcome => ({ refused: String(e?._tag) }) }),
        Effect.provide(layer),
      )).catch((e: unknown): Outcome => ({ died: String(e) })),
    evals: () => list(Eval),
    /** Every row of every thing in the world, keyed `<thing> <id>`, for comparing before and after. */
    rows: async () => Object.fromEntries((await Promise.all(Object.entries(things).map(async ([name, t]) => (await list(t)).map((r) => [`${name} ${String(r["id"])}`, { ...r }] as const)))).flat()),
  };
};

/** The evals other than the expired ones that cover `id`, and their states. */
const covering = (evals: ReadonlyArray<Instance>, id: string) => evals.filter((e) => !EXPIRED.has(String(e["id"])) && (e["triggers"] as ReadonlyArray<string>).includes(id)).map((e) => String(e.state));

describe("28 only a person reevaluates", () => {
  for (const [who, principal] of Object.entries(agents)) {
    it(`${who} is refused NotAllowed, writes nothing, and the trigger stays covered`, async () => {
      const w = await world();
      const before = await w.rows();
      expect(await w.reevaluate(principal), "what the agent's reevaluate came back with").toEqual({ refused: "NotAllowed" });
      expect(await w.rows(), "every row after the refused call").toEqual(before);
      await w.pass("sag_one");
      expect([...covering(await w.evals(), "trg_0001"), ...covering(await w.evals(), "trg_0003")], "an eval made by the pass after the refused call").toEqual([]);
    });
  }

  it("the declaration the app serves, once its handler has loaded, admits no agent and lists one entry", async () => {
    const w = await world();
    expect(admitsAgent(w.allowed as never), "the served allowed list admits an agent").toBe(false);
    expect(w.allowed.length, "the served allowed list's entries").toBe(1);
  });

  describe("in the model", () => {
    const built = lazy(build);
    afterAll(removeCopies);

    it("trigger.reevaluate is a person's, by any way a person signs in, and not an agent's tool", () => {
      const op = built().model["operations"]["trigger.reevaluate"];
      expect(op?.agentTool, "trigger.reevaluate must not be an agent's tool").toBe(false);
      const allowed = ((op?.allowed ?? []) as ReadonlyArray<{ readonly via?: ReadonlyArray<string> }>).map((a) => ({ ...a, ...(a.via === undefined ? {} : { via: [...a.via].sort() }) }));
      expect(allowed, "allowed: a signed-in person, through a session, a key or a device, and no one else").toEqual([{ kind: "signed-in", via: ["device", "key", "session"] }]);
    });
  });

  for (const [who, c] of Object.entries(people)) {
    it(`${who} still reevaluates: the call takes that trigger alone out of the expired eval, and the next pass judges it alone`, async () => {
      const w = await world();
      const before = await w.rows();
      expect(await w.reevaluate(c.principal, c.trigger), "what the person's reevaluate came back with").toEqual({ answer: {} });
      const held = before[`Eval ${c.eval}`] as Instance;
      const want = { ...before, [`Eval ${c.eval}`]: { ...held, triggers: (held["triggers"] as ReadonlyArray<string>).filter((t) => t !== c.trigger) } };
      expect(await w.rows(), "every row after the person's call: only the expired eval lost that trigger").toEqual(want);
      await w.pass(c.superagent);
      expect(covering(await w.evals(), c.trigger), "the evals covering the reevaluated trigger").toEqual(["queued"]);
      for (const t of c.other) expect(covering(await w.evals(), t), `${t} was not reevaluated: it stays covered`).toEqual([]);
    });
  }
});
