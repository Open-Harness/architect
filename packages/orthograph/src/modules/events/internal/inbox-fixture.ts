// The fixture of the E1 checks (#1165): the seam as `../inbox.test.ts` states it, the test token and the ledger an app keeps. Written by the checks author;
// a builder never edits this file (AGENTS.md, "Journeys and checks come first"). The contract is in the header of `../inbox.test.ts`.
import { Effect, Schema } from "effect";
import * as Server from "../../../server.ts";
import { Plugins } from "#modules/plugins/service.js";
import { Events } from "../service.ts";
import type { On } from "../types.ts";

// ---- the seam, as this check states it ----
export interface Entry {
  readonly source: "chain";
  readonly id: string;
  readonly event: string;
  readonly fields: Readonly<Record<string, unknown>>;
}
export type Answer = "accepted" | "seen";
export interface Hop {
  readonly event: string;
  readonly on: On;
  readonly run: (input: unknown) => Effect.Effect<void, unknown>;
}
export interface InboxApi {
  readonly memory: () => unknown;
  readonly make: (spec: { readonly store: unknown; readonly hops: ReadonlyArray<Hop> }) => { readonly accept: (entry: Entry) => Effect.Effect<Answer, unknown> };
}
export type CorrectedFn = (event: unknown, map: (fields: never) => unknown) => On & { readonly corrected?: unknown };

/** A piece E1 adds is not there yet: the check fails here, naming it. */
const missing = (what: string): never => Effect.runSync(Effect.die(new Error(what)));

export const inbox = (): InboxApi => {
  const found = (Server as Record<string, unknown>)["Inbox"];
  if (found === undefined) return missing("orthograph/server exports no `Inbox`: E1 adds `Inbox.make({ store, hops })` and `Inbox.memory()` (#1165)");
  return found as InboxApi;
};
export const corrected: CorrectedFn = (event, map) => {
  const found = (Events as unknown as Record<string, unknown>)["corrected"];
  if (typeof found !== "function") return missing("`Blueprint.corrected` does not exist: E1 adds it, the `on:` entry that undoes a chain event when the chain takes it back (#1165)");
  return (found as CorrectedFn)(event, map);
};
export const on = (event: unknown, map: (fields: never) => unknown): On => Events.on(event as never, map as never);

// ---- an ERC-20 `Transfer`, as an adapter declares it and the follower hands it on ----
export const Transfer = Plugins.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString }));
export const Approval = Plugins.incoming(Schema.Struct({ owner: Schema.String, spender: Schema.String, value: Schema.BigIntFromString }));
export const token = Plugins.adapter({ description: "A test token.", events: { Transfer, Approval } });

export const CHAIN = 31337;
export const SAFE = "0x5afe00000000000000000000000000000000cafe";
export const PAYER = "0x00000000000000000000000000000000000000aa";
export const hashA = `0x${"a1".repeat(32)}`;
export const hashB = `0x${"b2".repeat(32)}`;
// Beyond 2^53: a handler given a JavaScript number, or the string itself, is seen to.
export const BIG = 9007199254740993n;

// Every entry is frozen, fields and all, as it crosses Durable Object RPC: an inbox that changes what it was handed (and so a retry of it) is seen to.
export const frozen = (e: Entry): Entry => Object.freeze({ ...e, fields: Object.freeze({ ...e.fields }) });
export const confirmed = (blockHash: string, logIndex: number, value: bigint, from = PAYER, chain = CHAIN, event = "Token.Transfer"): Entry =>
  frozen({ source: "chain", id: `${chain}:${blockHash}:${logIndex}`, event, fields: { from, to: SAFE, value: String(value) } });
export const correctionOf = (e: Entry): Entry => frozen({ source: "chain", id: `${e.id}:corrected`, event: `${e.event}Corrected`, fields: { ...e.fields, wasConfirmed: true } });

/** An app's effect that the check can read: a received-payment ledger, as S2 keeps one. `record` adds what a Transfer brought, `undo` takes it away again. */
export const ledger = () => {
  const calls: Array<{ readonly hop: string; readonly input: unknown }> = [];
  const balance = new Map<string, bigint>();
  const add = (input: unknown, sign: 1n | -1n) => Effect.suspend(() => {
    const { to, value } = input as { to: string; value: bigint };
    if (typeof value !== "bigint") return Effect.die(new Error(`the hop was given value ${JSON.stringify(String(value))} of type ${typeof value}: map must be given the fields decoded by the event's schema (a bigint)`));
    return Effect.sync(() => void balance.set(to, (balance.get(to) ?? 0n) + sign * value));
  });
  const hop = (name: string, eventName: string, declared: On, sign: 1n | -1n): Hop => ({
    event: eventName, on: declared,
    run: (input) => Effect.sync(() => void calls.push({ hop: name, input })).pipe(Effect.andThen(add(input, sign))),
  });
  return { calls, balanceOf: (who: string) => balance.get(who) ?? 0n, hop, named: (name: string) => calls.filter((c) => c.hop === name) };
};

export const record = (e: { from: string; to: string; value: bigint }) => ({ to: e.to, value: e.value, payer: e.from });
// The undo is given the event as it was decoded, whole: a key the wire added (`wasConfirmed`) is seen to.
export const undo = (e: { from: string; to: string; value: bigint }) => ({ ...e });

/** The inbox an app with S2's two operations makes: `payment.record` on a Transfer, `payment.undo` on its correction. */
export const app = (store: unknown) => {
  const l = ledger();
  const hops = [
    l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n),
    l.hop("undo", "Token.Transfer", corrected(token.events.Transfer, undo as never), -1n),
  ];
  return { ...l, inbox: inbox().make({ store, hops }) };
};
export const run = <A>(e: Effect.Effect<A, unknown>) => Effect.runPromise(e);
export class Busy extends Error { readonly _tag = "Busy"; }
export const busy = new Busy("the handler's database is busy");
export const acceptAll = (box: { accept: (e: Entry) => Effect.Effect<Answer, unknown> }, entries: ReadonlyArray<Entry>) =>
  run(Effect.forEach(entries, (e) => box.accept(e)));
