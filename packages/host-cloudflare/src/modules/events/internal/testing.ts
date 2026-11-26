// The fixture of E1's host check (#1165, design/decisions/CX-events-in.md call 1): the seam read off the two front doors, a chain event named as generated
// code names it, and an inbox with one hop that behaves as a check says. Written by the checks author; a builder never edits it. `testing.ts`, so the
// build leaves it out. The names E1 adds are read at run time, so this file typechecks before they exist.
import type { Busy, Timers } from "@orthograph/language-effect";
import { Blueprint } from "orthograph";
import * as Server from "orthograph/server";
import { Effect, Schema } from "effect";
import * as Host from "../../../index.ts";

export type Answer = "accepted" | "seen";
export interface Entry { readonly source: string; readonly id: string; readonly event: string; readonly fields: Readonly<Record<string, unknown>> }
export interface InboxOf { readonly rows: Effect.Effect<ReadonlyArray<{ readonly state: string; readonly attempts: number }>> }
export interface Sink { readonly accept: (entry: Entry) => Effect.Effect<Answer, never, Busy | Timers> }

export const missing = (what: string): never => Effect.runSync(Effect.die(new Error(what)));
export const sinkOf = (inbox: unknown): Sink => {
  const found = (Host as Record<string, unknown>)["Inboxes"] as { readonly sink: (inbox: unknown) => Sink } | undefined;
  return found === undefined ? missing("@orthograph/host-cloudflare exports no `Inboxes`: E1 adds `Inboxes.sink(inbox)`, the follower's sink over orthograph's Inbox (CX-events-in)") : found.sink(inbox);
};
export const coreOf = () => {
  const found = (Server as Record<string, unknown>)["Inbox"] as { readonly memory: () => unknown; readonly make: (spec: unknown) => InboxOf } | undefined;
  return found ?? missing("orthograph/server exports no `Inbox`: E1 adds it (CX-events-in)");
};

export const Transfer = Blueprint.incoming(Schema.Struct({ from: Schema.String, to: Schema.String, value: Schema.BigIntFromString }));
(Server.EventNames.name as (event: unknown, name: string) => void)(Transfer, "Inboxed.Transfer");
export const on = (map: (e: never) => unknown) => (Blueprint.on as (e: unknown, m: unknown) => unknown)(Transfer, map);
export const entry = (logIndex: number): Entry =>
  Object.freeze({ source: "chain", id: `31337:0x${"a1".repeat(32)}:${logIndex}`, event: "Inboxed.Transfer", fields: Object.freeze({ from: "0xaa", to: "0xbb", value: "5" }) });

/** An inbox whose one hop does what `behave` says on its n-th call, and tells `called` each time. */
export const inboxWith = (behave: (attempt: number) => Effect.Effect<unknown, unknown>) => {
  const calls: Array<unknown> = [];
  let attempt = 0;
  const hop = { to: "payment.record", on: on((e) => e), run: (payload: unknown) => Effect.suspend(() => { calls.push(payload); attempt++; return behave(attempt); }) };
  const core = coreOf();
  return { calls, inbox: core.make({ store: core.memory(), hops: [hop] }) };
};
