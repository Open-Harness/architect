// `also`: a handler's second move (GOAL17-slice9-build, call 8). A handler of one thing sometimes must record another's, in the same commit: an agent's
// configuration change records a Proposal, a stop withdraws a Mandate. The move is the machine's own, so its `from` is checked, its state set and its
// event journalled as if its operation had run; the commit carries both entries or neither.
import { Effect, Ref } from "effect";
import type { Move } from "orthograph";
import { Ids } from "#modules/ids/service.js";
import type { Unit } from "#modules/records/types.js";
import type { Entry } from "#modules/journal/types.js";
import { settle } from "./move.ts";

export interface Also {
  readonly id?: string;
  /** The instance's fields: all of them for a creating move, the changed ones for any other. */
  readonly fields: Readonly<Record<string, unknown>>;
  /** The outcome, when the move has more than one `to`. */
  readonly to?: string;
}

/** Make `move` of `move.machine.thing`, and keep its entry for the commit. Answers the instance's id (minted for a creating move). */
export const makeAlso = (name: string, unit: Unit, entries: Ref.Ref<ReadonlyArray<Entry>>) => (move: Move, spec: Also): Effect.Effect<string> =>
  Effect.gen(function* () {
    const thing = move.machine.thing;
    const creates = move.from.length === 0;
    const outcome = spec.to ?? (move.to.length === 1 ? move.to[0] : undefined);
    if (outcome === undefined || !move.to.includes(outcome)) return yield* Effect.die(new Error(`${name}: also ${move.key} needs one of ${move.to.join(", ")}, not ${String(spec.to)}`));
    const id = spec.id ?? (creates ? ((yield* Ids.of(thing.fields["id"]!)) as string) : undefined);
    if (id === undefined) return yield* Effect.die(new Error(`${name}: also ${move.key} moves an existing instance, so it needs its id`));
    const stored = yield* unit.read(thing, id);
    if (creates && stored !== undefined) return yield* Effect.die(new Error(`${name}: also ${move.key} creates ${id}, which exists`));
    if (!creates) {
      if (stored === undefined) return yield* Effect.die(new Error(`${name}: also ${move.key} moves ${id}, which is not there`));
      const state = stored.state ?? "none";
      if (!move.from.includes(state)) return yield* Effect.die(new Error(`${name}: also ${move.key} cannot move ${id} from ${state} (from ${move.from.join(", ")})`));
    }
    const instance = { ...(stored ?? {}), ...spec.fields, id };
    if (creates) yield* unit.records.insert(thing, instance as never);
    else if (Object.keys(spec.fields).length > 0) yield* unit.records.update(thing, id, spec.fields as never);
    // An event field that is the thing's own id (`proposal`, whatever the event calls it) is the instance's id, as it is for the operation's own move.
    const idField = thing.fields["id"];
    const isId = (k: string) => { const f = move.emits.fields[k]; return f !== undefined && idField !== undefined && f.kind === "field" && f.of === idField.of && f.key === idField.key; };
    const source = Object.fromEntries(Object.keys(move.emits.fields).flatMap((k) => (k in instance ? [[k, (instance as Record<string, unknown>)[k]]] : isId(k) ? [[k, id]] : [])));
    const missing = Object.keys(move.emits.fields).filter((k) => !(k in source));
    if (missing.length > 0) return yield* Effect.die(new Error(`${name}: also ${move.key}: its event needs ${missing.join(", ")}`));
    const picked = source;
    const entry = yield* settle(name, move, thing, id, picked, outcome, unit);
    yield* Ref.update(entries, (all) => [...all, entry]);
    return id;
  });
