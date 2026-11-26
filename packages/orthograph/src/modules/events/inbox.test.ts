// Goal 16, unit E1 (#1165, CX-safe section 4): events in from the chain. `on:` for an adapter's confirmed chain events: the follower hands each confirmed event to the
// inbox, which delivers it once, keyed `${chainId}:${blockHash}:${logIndex}`, and a take-back delivers a correction (`…:corrected`, `wasConfirmed`) that undoes what the event did.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// Done when (#1165): a confirmed event delivered twice settles once; an `anvil_reorg` that drops it delivers a correction and the handler's effect is undone; a restart replays
// nothing already settled.
//
// THE SEAM THIS CHECK PICKS. No decision gives the inbox a shape beyond the follower's port (`packages/host-cloudflare/src/modules/follower/types.ts`, `FollowerSink`, Ask #481:
// `accept({ source: "chain", id, event, fields })` answering "accepted" or "seen"). The smallest shape that fits, all in `orthograph` (pure Effect, no host):
//   - `Blueprint.on(token.events.Transfer, map)`: an operation's `on:` entry for an adapter's chain event, as for a blueprint's own event (`Events.on`, which already takes any
//     event at runtime). Its `map` is given the event's fields decoded by the adapter event's `schema` (a uint arrives as a decimal string, M6-chain item 2).
//   - `Blueprint.corrected(token.events.Transfer, map)`: NEW. The `on:` entry of the operation that undoes what the event did: it runs once when the chain takes a confirmed event
//     back, and its `map` is given the taken-back event's own fields, decoded the same way (`wasConfirmed` is the wire's, not the event's). An `On` with `corrected: true`.
//   - `Inbox`, NEW, on `orthograph/server` (what generated code and hosts use):
//       Inbox.memory(): InboxStore                        the ids an inbox has settled, kept in memory (worlds and tests); a host's store keeps them in its database
//       Inbox.make({ store, hops }): { accept }          `hops` are the declared `on:` entries, each with the wire name of its event (`<Contract>.<Event>`, as the follower
//                                                        names it) and `run`, the operation the host calls with what `map` gave
//       accept(entry): Effect<"accepted" | "seen", E>   `FollowerSink.accept`'s shape: the follower's sink binds to it
//     A confirmed entry whose id the store has not settled runs every hop of that event (not its `corrected` ones), once each, and answers "accepted" after they ran; an id already
//     settled runs nothing and answers "seen". A correction (id `<the event's id>:corrected`, event `<Contract>.<Event>Corrected`, fields the event's and `wasConfirmed: true`) runs
//     the event's `corrected` hops once and is itself settled by its own id. A hop that fails fails `accept` with its error and settles nothing, so the follower's outbox hands the
//     same entry on again and it runs then (the follower keeps it until the sink takes it, its README). A restart is a new `Inbox.make` over the same store.
//     In full, as the checks below plant it (the hostile pass's table is in the pull request):
//       - a hop's event is matched on the whole wire name: `OtherToken.Transfer` is not `Token.Transfer`, and an adapter's own `Token.TransferCorrected`
//         (an id without `:corrected`, fields without `wasConfirmed`) is a confirmed event of that name, not a correction;
//       - the id is the whole of `${chainId}:${blockHash}:${logIndex}`: the same block hash and log index on another chain is another event;
//       - each hop is given its own `map`'s answer, from the fields decoded by its event's `schema` (each field as the schema says; `wasConfirmed` is not the event's);
//       - an event's hops run one after another, in the order given;
//       - `accept` fails, and settles nothing, when a hop fails (with that very error, typed), when a hop throws, and when the fields do not decode; a correction
//         whose undo fails is retried like any entry;
//       - the entry `accept` is handed is not changed (it is frozen here, as it is after RPC).
//     Not judged here: two `accept`s of one id at the same moment (the follower hands entries on one at a time, its README), and a correction of an event this
//     store never took (the follower hands a correction on only after the event's own entry was taken).
//
// Prior art, credited: the unique id that answers "accepted" or "seen" is Goal 17 slice 11's door inbox (`packages/host-cloudflare/src/modules/inbound/internal/accept.ts`, built
// on `goal/superagent`, GOAL17-slice11-build), and the entries are those `e2e/on-chain/11-m6-09-follower.test.ts` proves the follower hands on after a real `anvil_reorg`.
// What the Anvil run adds on top of these entries (a real reorg through the follower into this inbox) is S2's check (#1169), which uses this unit.
//
// The new names are read off their modules at run time, so this file typechecks before they exist and fails on the missing name, not on a compile error.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { BIG, CHAIN, PAYER, SAFE, Transfer, acceptAll, app, busy, confirmed, corrected, correctionOf, frozen, hashA, hashB, inbox, ledger, on, record, run, token, undo } from "./internal/inbox-fixture.ts";
import type { Hop } from "./internal/inbox-fixture.ts";

describe("events in from the chain (E1, #1165): `on:` for an adapter's confirmed chain events, once each, with corrections", () => {
  it("`Blueprint.corrected` declares the `on:` entry that undoes a chain event: its event, its map and `corrected: true`, frozen; `Blueprint.on` is not a correction", () => {
    const declared = corrected(token.events.Transfer, undo as never);
    expect(declared.kind).toBe("on");
    expect(declared.event).toBe(Transfer);
    expect(declared.map).toBe(undo);
    expect(declared.corrected).toBe(true);
    expect(Object.isFrozen(declared)).toBe(true);
    expect((on(token.events.Transfer, record as never) as { corrected?: unknown }).corrected).not.toBe(true);
  });

  it("a confirmed event delivered twice settles once: the first is \"accepted\" after its hop ran with the decoded fields, the second is \"seen\" and runs nothing", async () => {
    const a = app(inbox().memory());
    const entry = confirmed(hashA, 0, BIG);
    expect(await run(a.inbox.accept(entry))).toBe("accepted");
    expect(a.named("record")).toEqual([{ hop: "record", input: { to: SAFE, value: BIG, payer: PAYER } }]);
    expect(await run(a.inbox.accept(entry))).toBe("seen");
    expect(await run(a.inbox.accept({ ...entry, fields: { ...entry.fields } }))).toBe("seen");
    expect(a.calls).toHaveLength(1);
    expect(a.balanceOf(SAFE)).toBe(BIG);
  });

  it("each id is its own event: two logs of one block (log indexes 0 and 1) and the same log in another block each run once", async () => {
    const a = app(inbox().memory());
    const entries = [confirmed(hashA, 0, 5n), confirmed(hashA, 1, 7n), confirmed(hashB, 0, 11n)];
    expect(await acceptAll(a.inbox, [...entries, ...entries])).toEqual(["accepted", "accepted", "accepted", "seen", "seen", "seen"]);
    expect(a.named("record").map((c) => (c.input as { value: bigint }).value)).toEqual([5n, 7n, 11n]);
    expect(a.balanceOf(SAFE)).toBe(23n);
    expect(a.named("undo")).toEqual([]);
  });

  it("a reorg that drops a confirmed event: its correction runs the `corrected` hop once with the event's own fields, and the handler's effect is undone", async () => {
    const a = app(inbox().memory());
    const first = confirmed(hashA, 0, BIG);
    // What check 11 shows the follower hands on after `anvil_reorg` replays the transfer in a new block: the correction of the first, then the new event.
    const replayed = confirmed(hashB, 0, BIG);
    expect(await acceptAll(a.inbox, [first, correctionOf(first)])).toEqual(["accepted", "accepted"]);
    expect(a.named("undo")).toEqual([{ hop: "undo", input: { from: PAYER, to: SAFE, value: BIG } }]);
    expect(a.named("record")).toHaveLength(1);
    expect(a.balanceOf(SAFE)).toBe(0n);
    expect(await run(a.inbox.accept(correctionOf(first)))).toBe("seen");
    expect(a.named("undo")).toHaveLength(1);
    expect(await run(a.inbox.accept(replayed))).toBe("accepted");
    expect(a.balanceOf(SAFE)).toBe(BIG);
    // The first event's own id stays settled: a late repeat of it is "seen" and does not put the dropped payment back.
    expect(await run(a.inbox.accept(first))).toBe("seen");
    expect(a.balanceOf(SAFE)).toBe(BIG);
    expect(a.calls.map((c) => c.hop)).toEqual(["record", "undo", "record"]);
  });

  it("a restart replays nothing already settled: a new inbox over the same store answers \"seen\" to every entry it took, and takes a new one once", async () => {
    const store = inbox().memory();
    const before = app(store);
    const first = confirmed(hashA, 0, 5n);
    const second = confirmed(hashA, 1, 7n);
    await acceptAll(before.inbox, [first, second, correctionOf(first)]);
    expect(before.balanceOf(SAFE)).toBe(7n);

    const after = app(store);
    expect(await acceptAll(after.inbox, [first, second, correctionOf(first)])).toEqual(["seen", "seen", "seen"]);
    expect(after.calls).toEqual([]);
    const third = confirmed(hashB, 0, 11n);
    expect(await acceptAll(after.inbox, [third, third])).toEqual(["accepted", "seen"]);
    expect(after.calls).toEqual([{ hop: "record", input: { to: SAFE, value: 11n, payer: PAYER } }]);

    const again = app(store);
    expect(await acceptAll(again.inbox, [first, second, correctionOf(first), third])).toEqual(["seen", "seen", "seen", "seen"]);
    expect(again.calls).toEqual([]);
  });

  it("two inboxes over two stores share nothing: an id one settled is new to the other", async () => {
    const one = app(inbox().memory());
    const two = app(inbox().memory());
    const entry = confirmed(hashA, 0, 5n);
    expect(await run(one.inbox.accept(entry))).toBe("accepted");
    expect(await run(two.inbox.accept(entry))).toBe("accepted");
    expect(two.calls).toHaveLength(1);
  });

  it("a hop that fails settles nothing: `accept` fails with its error, and the follower's retry of the same entry runs it and is \"accepted\"", async () => {
    const l = ledger();
    let failNext = true;
    const flaky: Hop = {
      event: "Token.Transfer", on: on(token.events.Transfer, record as never),
      run: (input) => (failNext ? Effect.sync(() => { failNext = false; }).pipe(Effect.andThen(Effect.fail(busy))) : l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n).run(input)),
    };
    const box = inbox().make({ store: inbox().memory(), hops: [flaky] });
    const entry = confirmed(hashA, 0, 5n);
    // `accept` fails with the hop's own error, as a typed failure (not a defect, not wrapped), so the follower's step sees it and retries.
    expect(await Effect.runPromise(Effect.flip(box.accept(entry)))).toBe(busy);
    expect(l.calls).toEqual([]);
    expect(await run(box.accept(entry))).toBe("accepted");
    expect(l.calls).toHaveLength(1);
    expect(await run(box.accept(entry))).toBe("seen");
    expect(l.calls).toHaveLength(1);
  });

  it("an entry runs only the hops of its own event, and every one of them: another event's hops, and a plain hop on a correction, run nothing", async () => {
    const l = ledger();
    const approvals: Array<unknown> = [];
    const hops: ReadonlyArray<Hop> = [
      l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n),
      l.hop("also", "Token.Transfer", on(token.events.Transfer, ((e: { to: string; value: bigint }) => ({ to: e.to, value: e.value * 2n, payer: "also" })) as never), 1n),
      l.hop("undo", "Token.Transfer", corrected(token.events.Transfer, undo as never), -1n),
      { event: "Token.Approval", on: on(token.events.Approval, ((e: { owner: string }) => ({ owner: e.owner })) as never), run: (input) => Effect.sync(() => void approvals.push(input)) },
    ];
    const box = inbox().make({ store: inbox().memory(), hops });
    const transfer = confirmed(hashA, 0, 5n);
    expect(await run(box.accept(transfer))).toBe("accepted");
    expect(l.calls).toEqual([{ hop: "record", input: { to: SAFE, value: 5n, payer: PAYER } }, { hop: "also", input: { to: SAFE, value: 10n, payer: "also" } }]);
    expect(approvals).toEqual([]);
    expect(await run(box.accept(correctionOf(transfer)))).toBe("accepted");
    expect(l.calls.map((c) => c.hop)).toEqual(["record", "also", "undo"]);
    const approval = frozen({ source: "chain", id: `${CHAIN}:${hashB}:3`, event: "Token.Approval", fields: { owner: PAYER, spender: SAFE, value: "1" } });
    expect(await run(box.accept(approval))).toBe("accepted");
    expect(approvals).toEqual([{ owner: PAYER }]);
    expect(l.calls).toHaveLength(3);
  });

  it("an event no hop takes is still settled once: \"accepted\", then \"seen\"", async () => {
    const a = app(inbox().memory());
    const approval = frozen({ source: "chain", id: `${CHAIN}:${hashA}:2`, event: "Token.Approval", fields: { owner: PAYER, spender: SAFE, value: "1" } });
    expect(await acceptAll(a.inbox, [approval, approval])).toEqual(["accepted", "seen"]);
    expect(a.calls).toEqual([]);
  });
});
