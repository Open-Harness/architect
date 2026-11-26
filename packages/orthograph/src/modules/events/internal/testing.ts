// The fixture of E1's checks (#1165, design/decisions/CX-events-in.md): the seam as the decision states it, read through the front door, a test token's
// two chain events, and the ledger an app keeps (S2's received payments). Written by the checks author; a builder never edits it (AGENTS.md, "Journeys and
// checks come first"). `testing.ts`, so the build leaves it out (tsconfig.build.json).
//
// The names E1 adds are read off the front door at run time, so this file typechecks before they exist and a check fails on the missing name.
import { Effect, Schema } from "effect";
import { TestClock } from "effect/testing";
import { Blueprint } from "../../../index.ts";
import * as Server from "../../../server.ts";
import type { On } from "../types.ts";

// ---- the seam (CX-events-in, the call) ----
export interface Entry {
  readonly source: string;
  readonly id: string;
  readonly event: string;
  readonly fields: Readonly<Record<string, unknown>>;
}
export type Answer = "accepted" | "seen";
export interface Meta {
  readonly id: string;
  readonly source: string;
  readonly key: string;
  readonly attempt: number;
}
export interface Hop {
  readonly to: string;
  readonly on: On;
  readonly run: (payload: unknown, meta: Meta) => Effect.Effect<unknown, unknown>;
}
export interface JournalRow {
  readonly id: string;
  readonly operation: string;
  readonly move: string;
  readonly subject: string;
  readonly event: string;
  readonly fields: unknown;
  readonly defect?: string;
}
export interface DeliveryRow {
  readonly event: string;
  readonly seq: number;
  readonly to: string;
  readonly subject: string;
  readonly state: "pending" | "claimed" | "delivered" | "refused" | "failed";
  readonly attempts: number;
  readonly due: number;
  readonly outcome?: string;
}
export interface InboxOf {
  readonly accept: (entry: Entry) => Effect.Effect<Answer>;
  readonly pass: Effect.Effect<{ readonly next: number | undefined }>;
  readonly journal: Effect.Effect<ReadonlyArray<JournalRow>>;
  readonly rows: Effect.Effect<ReadonlyArray<DeliveryRow>>;
}
interface InboxApi {
  readonly memory: () => unknown;
  readonly make: (spec: { readonly store: unknown; readonly hops: ReadonlyArray<Hop> }) => InboxOf;
}
interface Naming {
  readonly name: (event: unknown, name: string) => void;
}

/** M5-reach-out Q5: the first retry 1 s after, doubling, never more than an hour apart, 15 attempts; a claim's lease is 30 s. */
export const BACKOFF = 1_000;
export const MAX = 3_600_000;
export const ATTEMPTS = 15;
export const LEASE = 30_000;

const missing = (what: string): never => Effect.runSync(Effect.die(new Error(what)));
export const inbox = (): InboxApi => {
  const found = (Server as Record<string, unknown>)["Inbox"];
  return found === undefined ? missing("orthograph/server exports no `Inbox`: E1 adds `Inbox.memory()` and `Inbox.make({ store, hops })` (CX-events-in)") : (found as InboxApi);
};
/** What generated code does once per event: give it its wire name. */
const naming = (Server as unknown as { readonly EventNames: Naming }).EventNames;

// ---- a test token's chain events, as an adapter declares them, named as generated code names them ----
export const Transfer = Blueprint.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString }));
// K7 Q6: a correction is an event of its own, the event's fields and `wasConfirmed`.
export const TransferCorrected = Blueprint.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString, wasConfirmed: Schema.Boolean }));
export const Approval = Blueprint.incoming(Schema.Struct({ owner: Schema.String, spender: Schema.String, value: Schema.BigIntFromString }));
export const token = Blueprint.adapter({ description: "A test token.", events: { Transfer, TransferCorrected, Approval } });
naming.name(Transfer, "Token.Transfer");
naming.name(TransferCorrected, "Token.TransferCorrected");
naming.name(Approval, "Token.Approval");

export const CHAIN = 31337;
export const SAFE = "0x5afe00000000000000000000000000000000cafe";
export const PAYER = "0x00000000000000000000000000000000000000aa";
export const hashA = `0x${"a1".repeat(32)}`;
export const hashB = `0x${"b2".repeat(32)}`;
/** Beyond 2^53: a hop given a JavaScript number, or the string itself, is seen to. */
export const BIG = 9007199254740993n;

/** Frozen, fields and all, as an entry is after Durable Object RPC: an inbox that changes what it is handed is seen to. */
export const frozen = (e: Entry): Entry => Object.freeze({ ...e, fields: Object.freeze({ ...e.fields }) });
/** What the follower hands on for a confirmed `Transfer` (check 11: id `${chainId}:${blockHash}:${logIndex}`, uints as decimal strings). */
export const confirmed = (blockHash: string, logIndex: number, value: bigint, chain = CHAIN, event = "Token.Transfer"): Entry =>
  frozen({ source: "chain", id: `${chain}:${blockHash}:${logIndex}`, event, fields: { from: PAYER, to: SAFE, value: String(value) } });
/** What it hands on when the chain takes a confirmed one back: its own id and event, the fields and `wasConfirmed: true`. */
export const correctionOf = (e: Entry): Entry => frozen({ source: e.source, id: `${e.id}:corrected`, event: `${e.event}Corrected`, fields: { ...e.fields, wasConfirmed: true } });
/** The journal id of an entry (Q2.3): `<source>:<the sender's id>`. */
export const journalId = (e: Entry) => `${e.source}:${e.id}`;
/** The key a delivery runs under (Q3.2). */
export const keyOf = (e: Entry, operation: string) => `on|${journalId(e)}|${operation}`;

export class NotOurs extends Error { readonly _tag = "NotOurs"; }

/** How a hop behaves on its n-th call (counted per hop) with this payload: "never" parks until interrupted. */
export type Behave = (attempt: number, payload: unknown) => "ok" | "refuse" | "die" | "throw" | "never";

/** An app's effect the checks read: a received-payment ledger, with every call each operation had. */
export const ledger = () => {
  const calls: Array<{ readonly to: string; readonly payload: unknown; readonly meta: Meta }> = [];
  const balance = new Map<string, bigint>();
  const hop = (to: string, declared: On, sign: 1n | -1n, behave: Behave = () => "ok"): Hop => {
    let attempt = 0;
    return {
      to, on: declared,
      run: (payload, meta) => Effect.suspend(() => {
        attempt++;
        calls.push({ to, payload, meta });
        const how = behave(attempt, payload);
        if (how === "refuse") return Effect.fail(new NotOurs("not a payment of ours"));
        if (how === "die") return Effect.die(new Error(`${to} died on attempt ${attempt}\nsecond line`));
        if (how === "never") return Effect.never;
        if (how === "throw") return Effect.sync(() => JSON.parse("{ not json"));
        const { to: who, value } = payload as { to: string; value: bigint };
        if (typeof value !== "bigint") return Effect.die(new Error(`${to} was given value ${String(value)} (${typeof value}): the map must be given the fields decoded by the event's schema`));
        return Effect.sync(() => void balance.set(who, (balance.get(who) ?? 0n) + sign * value));
      }),
    };
  };
  return { calls, hop, balanceOf: (who: string) => balance.get(who) ?? 0n, to: (name: string) => calls.filter((c) => c.to === name) };
};

export const record = (e: { from: string; to: string; value: bigint }) => ({ to: e.to, value: e.value, payer: e.from });
export const undo = (e: { from: string; to: string; value: bigint; wasConfirmed: boolean }) => ({ to: e.to, value: e.value, payer: e.from, wasConfirmed: e.wasConfirmed });
const on = (event: unknown, map: unknown): On => (Blueprint.on as (e: unknown, m: unknown) => On)(event, map);

/** S2's app: `payment.record` on a `Transfer`, `payment.undo` on its correction, each with plain `Blueprint.on`. */
export const app = (store: unknown, behave?: { readonly record?: Behave; readonly undo?: Behave }) => {
  const l = ledger();
  const hops = [
    l.hop("payment.record", on(Transfer, record), 1n, behave?.record),
    l.hop("payment.undo", on(TransferCorrected, undo), -1n, behave?.undo),
  ];
  return { ...l, hops, inbox: inbox().make({ store, hops }) };
};
export { on };

/** Every check runs on a test clock, which starts at 0 and moves only when the check moves it. */
export const run = <A>(e: Effect.Effect<A, unknown>) => Effect.runPromise(Effect.provide(e, TestClock.layer()));
export const at = (ms: number) => TestClock.setTime(ms);
