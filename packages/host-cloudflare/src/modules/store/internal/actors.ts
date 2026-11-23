// The Worker's side of an actor: name it from the thing's table and the instance id, then find or commit over RPC.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import type { Commit, Instance, Stored } from "@orthograph/language-effect";
import type { ActorApi, ActorWrite } from "#modules/actors/types.js";
import { decodeRow, encodeFields } from "./rows.ts";

const stubOf = (actors: DurableObjectNamespace, table: string, id: string) =>
  actors.get(actors.idFromName(`${table}:${id}`)) as unknown as { [K in keyof ActorApi]: (...a: Parameters<ActorApi[K]>) => Promise<Awaited<ReturnType<ActorApi[K]>>> };

export const actorFind = (actors: DurableObjectNamespace, thing: Thing, table: string, id: string): Effect.Effect<Stored | undefined> =>
  Effect.gen(function* () {
    const found = yield* Effect.promise(() => stubOf(actors, table, id).find());
    if (!found) return undefined;
    const { instance } = yield* decodeRow(thing, { ...found.row, ...(found.state !== null ? { state: found.state } : {}) });
    return { instance, version: found.version };
  });

/** An actor commit: every write is to one instance, because one actor owns one instance (D2 #38). */
export const actorCommit = (actors: DurableObjectNamespace, { writes, entries }: Commit, tableOf: (thing: Thing) => string) =>
  Effect.gen(function* () {
    const ids = new Set(writes.map((w) => (w.kind === "insert" ? String(w.fields["id"]) : w.id)));
    if (ids.size !== 1) return yield* Effect.die(new Error("an actor commit writes exactly one instance"));
    const first = writes[0]!;
    const id = [...ids][0]!;
    const wire = yield* Effect.forEach(writes, (w): Effect.Effect<ActorWrite> =>
      w.kind === "insert"
        ? Effect.map(encodeFields(w.thing, w.fields as Instance, false), (row) => ({ kind: "insert", row, state: w.state ?? null }))
        : Effect.map(encodeFields(w.thing, w.changes as Instance, true), (changes) => ({ kind: "update", version: w.version, changes, state: w.state ?? null })),
    );
    const journal = entries.map((e) => ({ ...e, fields: JSON.stringify(e.fields) }));
    return yield* Effect.promise(() => stubOf(actors, tableOf(first.thing), id).commit(wire, journal));
  });
