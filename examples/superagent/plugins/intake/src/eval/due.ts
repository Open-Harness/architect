import { Clock, Effect } from "effect";
import { Ids, Records, Store, type Handler, type Instance } from "@orthograph/language-effect";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import { activeClock } from "../modules/clock/service.ts";
import type declaration from "../../blueprint/things/eval/verbs/due.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";
import { Trigger } from "../../blueprint/things/trigger/thing.ts";
import { Thread } from "../../blueprint/things/thread/thing.ts";

/** How long the main agent has to judge an eval: ten minutes from the moment it is told. */
const TIMEOUT_MS = 600_000n;
/** A page of the store's list: evals and triggers are never deleted, so a pass reads each kind to its end, never a first few. */
const PAGE = 100;
const LIVE = ["queued", "delivered"];

const all = (superagent: unknown, thing: typeof Eval | typeof Trigger | typeof Thread, order: "newest" | "oldest") =>
  Effect.flatMap(Store, (store) =>
    Effect.gen(function* () {
      const rows: Array<Instance> = [];
      let after: string | undefined;
      do {
        const page = yield* store.list({ thing, where: { superagent }, state: undefined, order, limit: PAGE, after });
        rows.push(...page.items);
        after = page.next ?? undefined;
      } while (after !== undefined);
      return rows;
    }));

/**
 * One pass of the eval clock. An eval that was told to the main agent and ran out of time is given up on (`unavailable`). Then each
 * thread with a trigger no eval covers and no eval running makes one, batching all of them: a trigger that arrives meanwhile waits.
 * What waits is read from the triggers and evals, never stored twice. Answers the evals it made.
 *
 * Nothing in the framework lets one operation call another, so this writes what `eval.start` and `eval.expire` write, in its own commit,
 * and the events of those two are not emitted: the harness slice (9) gives a pass the calls, and the delivery of an eval to the main agent.
 */
const due: Handler<typeof declaration, Records | Store> = ({ superagent }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const owner = yield* records.find(Superagent, superagent);
    const wall = BigInt(yield* Clock.currentTimeMillis);
    // An eval's clock is the superagent's active one (GOAL17-pause): the time it spent paused does not count against an eval that spans it.
    const now = owner === undefined ? wall : activeClock({ state: String(owner.state), pausedAt: owner["pausedAt"] as bigint | undefined, pausedFor: owner["pausedFor"] as bigint }, wall);
    const evals = yield* all(superagent, Eval, "oldest");
    const overdue = (e: Instance) => e.state === "delivered" && e["deliveredAt"] !== undefined && (e["deliveredAt"] as bigint) + (e["timeoutMs"] as bigint) <= now;
    for (const e of evals.filter(overdue)) yield* records.update(Eval, String(e["id"]), {}, "unavailable");
    const standing = evals.filter((e) => !overdue(e));
    const covered = new Set(standing.filter((e) => e.state !== "unavailable").flatMap((e) => e["triggers"] as ReadonlyArray<string>));
    const running = new Set(standing.filter((e) => LIVE.includes(String(e.state))).map((e) => e["thread"] as string));
    const threads = new Map((yield* all(superagent, Thread, "oldest")).map((t) => [t["key"] as string, t["id"] as string]));
    const waiting = new Map<string, Array<string>>();
    for (const t of yield* all(superagent, Trigger, "oldest")) {
      if (covered.has(String(t["id"]))) continue;
      waiting.set(t["thread"] as string, [...(waiting.get(t["thread"] as string) ?? []), String(t["id"])]);
    }
    let started = 0n;
    for (const [key, triggers] of waiting) {
      const thread = threads.get(key);
      if (thread === undefined || running.has(thread)) continue;
      yield* records.insert(Eval, { id: yield* Ids.of(Eval.fields.id), superagent, thread, triggers, activeAtStart: 0n, timeoutMs: TIMEOUT_MS } as never, "queued");
      started += 1n;
    }
    return { started };
  });

export default due;
