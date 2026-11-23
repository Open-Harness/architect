// What the stand-in keeps beyond its script: requests held open, rules that hold or fail the next ones, and who is waiting for a hold to appear.
import { Deferred, Effect, Ref } from "effect";
import type { Json, ScriptState } from "../../script/types.ts";
import { Script } from "../../script/service.ts";

/** Which requests a rule or a query means: only a request's number counts here (`nth`), as the model has one path. */
export interface Match { readonly nth?: number; readonly path?: string }
export interface Held { readonly id: string; readonly n: number; readonly about?: string; readonly agent?: string; readonly open: Deferred.Deferred<void> }
interface Waiter { readonly count: number; readonly nth: number | undefined; readonly done: Deferred.Deferred<void> }
export interface Rule { readonly match: Match; readonly left: number }
export interface FailRule extends Rule { readonly with: { readonly status: number } | "reset" }

export interface Inside {
  readonly script: ScriptState;
  readonly held: ReadonlyArray<Held>;
  readonly waiters: ReadonlyArray<Waiter>;
  readonly holds: ReadonlyArray<Rule>;
  readonly fails: ReadonlyArray<FailRule>;
  readonly counter: number;
}

export const fresh: Inside = { script: Script.empty, held: [], waiters: [], holds: [], fails: [], counter: 0 };

export const asMatch = (v: Json): Match => {
  const m = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  return { ...(typeof m["nth"] === "number" ? { nth: m["nth"] } : {}), ...(typeof m["path"] === "string" ? { path: m["path"] } : {}) };
};

/** A rule applies to request `n` on `path` while it has uses left; it is used up by being applied. */
export const applies = (match: Match, n: number, path: string): boolean => (match.nth === undefined || match.nth === n) && (match.path === undefined || match.path === path);

/** The first rule that applies, and the rules after it is used: a rule with no uses left is gone. */
export const useFirst = <R extends Rule>(rules: ReadonlyArray<R>, n: number, path: string): readonly [R | undefined, ReadonlyArray<R>] => {
  const at = rules.findIndex((r) => r.left > 0 && applies(r.match, n, path));
  if (at < 0) return [undefined, rules];
  const rule = rules[at]!;
  return [rule, rules.flatMap((r, i) => (i !== at ? [r] : r.left > 1 ? [{ ...r, left: r.left - 1 }] : []))];
};

/** Keep request `n` open until it is released; tell whoever waits for it to be held. */
export const hold = (state: Ref.Ref<Inside>, n: number, who: { readonly about?: string | undefined; readonly agent?: string | undefined }) =>
  Effect.gen(function* () {
    const open = yield* Deferred.make<void>();
    const entry = yield* Ref.modify(state, (s): readonly [Held, Inside] => {
      const held: Held = { id: `hld_${s.counter + 1}`, n, ...(who.about === undefined ? {} : { about: who.about }), ...(who.agent === undefined ? {} : { agent: who.agent }), open };
      return [held, { ...s, counter: s.counter + 1, held: [...s.held, held] }];
    });
    const after = yield* Ref.get(state);
    for (const w of after.waiters) if (after.held.filter((h) => w.nth === undefined || h.n === w.nth).length >= w.count) yield* Deferred.succeed(w.done, undefined);
    yield* Deferred.await(open);
    return entry;
  });

/** Wait until `count` held requests match `nth`, or give up after `waitMs` and answer what was held instead. */
export const heldBy = (state: Ref.Ref<Inside>, count: number, nth: number | undefined, waitMs: number) =>
  Effect.gen(function* () {
    const done = yield* Deferred.make<void>();
    const matching = (s: Inside) => s.held.filter((h) => nth === undefined || h.n === nth);
    const ready = yield* Ref.modify(state, (s): readonly [boolean, Inside] =>
      matching(s).length >= count ? [true, s] : [false, { ...s, waiters: [...s.waiters, { count, nth, done }] }]);
    if (!ready) yield* Deferred.await(done).pipe(Effect.timeoutOrElse({ duration: `${waitMs} millis`, orElse: () => Effect.void }));
    yield* Ref.update(state, (s) => ({ ...s, waiters: s.waiters.filter((w) => w.done !== done) }));
    return matching(yield* Ref.get(state));
  });

/** Let held requests go: one by id, or every one. Answers how many were open. */
export const release = (state: Ref.Ref<Inside>, which: string) =>
  Effect.gen(function* () {
    const freed = yield* Ref.modify(state, (s): readonly [ReadonlyArray<Held>, Inside] => {
      const out = s.held.filter((h) => which === "all" || h.id === which);
      return [out, { ...s, held: s.held.filter((h) => !out.includes(h)) }];
    });
    for (const h of freed) yield* Deferred.succeed(h.open, undefined);
    return freed.length;
  });
