# M8-checks: what time's checks assume where K23 is silent

Written 20 November 2026 by the ✍️ author of M8.02, M8.03 and M8.04, before any of M8 is built. K23 decides time; the
checks in `e2e/m8/` need a few names and shapes it leaves open, and building them found three places where the
milestone's rows could not stand as written. Each call here is the building agent's (`AGENTS.md`, "Who decides"); a
builder that finds one wrong asks the author, who changes the check and this record together.

## The problem, in code

A check must assert exact instants and counts, so it must name how a journey reads them. K23's own example cannot:

```ts
// design/decisions/K23-time.md, section 2
s.step("a month passes", s.clock.advance("1 month"),
  emits(MembershipRenewed, { membership: s.world.membership, period: 2 }), onTime()),
```

`emits` today looks for one event of that name in the step's call's journal (`prove/src/modules/journeys/internal/checks.ts:68`):
it cannot see a second renewal, and a clock step has no call of its own. Journeys also share one world
(`prove/src/modules/journeys/README.md`: "named per journey, so two journeys never share a person"), so with one clock,
a journey that moves a month moves every journey after it. And no value type is a time: `Blueprint.uint`, `text`, `id`
and `email` are all there is (`orthograph/src/modules/values/types.ts:16`).

## The calls

1. **A time value.** `Blueprint.instant()` is a value type: stored as a UTC instant, written on the wire, in answers,
   events and reads as ISO 8601 with milliseconds (`"2027-01-10T09:00:00.000Z"`). An anchor's field must be one.
2. **A clock step answers.** `s.clock.advance(span)` and `s.clock.moveTo(instant)` answer `{ now, fired }` once the world
   is quiet at the target: `now` is the world's instant as above; `fired` lists every move made by time that ran on the
   way, in the order it ran, each `{ thing, move, due }`. A journey asserts exactly what fired with `expect`, and the
   events of those calls are the step's journal for `emits` and `noEvents`. `emits` judges the first event of its name,
   as it does today, so a step that fires one move twice pins the second by `fired` and a read. A `fired` entry may
   carry more (when it ran, its trace) for prove's own use. Starting worlds have `s.clock` too.
3. **A journey that moves time has a world of its own,** whose clock starts at the environment's `starts`. Order in a
   run never changes what a journey sees. Journeys that never move time keep sharing.
4. **The keeper in journeys.** `Blueprint.keeper` is the keeper as a principal: in `allowed`, and as a cast member.
   `s.keeper.run(op, payload, { due })` fires a move made by time as the keeper does, for that due instant, with the
   keeper's request key (thing, move, due instant). A move made by time's operation declares `allowed: [Blueprint.keeper]`;
   the keeper is refused `NotAllowed` by every other operation, even one open to `Blueprint.anyone`, so every
   operation's declared refusals include `NotAllowed`.
5. **Calendar words.** A span in months or years is worked out in UTC when there is no anchor zone: one month from
   10 January 09:00 UTC is 10 February 09:00 UTC. A calendar anchor (`on: { day: 25 }`, `on: { day: "last" }`) is due at
   the start of that day in its zone: in London, midnight UTC in winter and 23:00 UTC the evening before in summer.
6. **Lazy.** A `lazy` move is worked out at the thing's next call that makes a move (a read is not a use), before that
   call's handler and inside the same call, so its events are in that call's journal. It is worked out once for the
   latest period that came due; the keeper never fires it and it never appears in `fired`.
7. **`late`.** A move made by time with no `late` must run at its due instant exactly. The on-time eval is named
   `on time`; it is judged for the operation of each move made by time, which then shows ten evals; every other
   operation keeps nine.
8. **A delayed keeper, on purpose.** `ORTHO_KEEPER_DELAY=<span>` in prove's environment makes a stepped world's keeper
   fire each timer that long after its due instant. It exists for check 04 and is refused on any clock but stepped.
9. **The world's clock door** (`/_world/*`, beside `cast` and `facts`):
   - `GET /_world/clock` answers `{ kind: "real" | "stepped" | "scaled", now, timers: [{ due, owner, name }] }`.
   - `POST /_world/clock/advance` with `{ span }` and `POST /_world/clock/move-to` with `{ to }` answer 200 with `{ now, fired }`;
     409 `{ _tag: "ClockNotMovable" }` on a real clock; and, when a process stays busy past the real-time limit,
     `{ _tag: "NeverQuiet", busy }`, where `busy` names each busy process by what it runs (an operation's name), and
     nothing has moved.
   - `GET /_world/follower` answers `{ block, at }`, the follower's checkpoint: the last block it has read and that
     block's time.
10. **What the docs and MCP say.** Each move made by time's page says when, in these words: "every month from
    \`startedAt\`", "14 days after \`overdueAt\`", "every month on day 25, in Europe/London", "every month on the last
    day, in Europe/London"; and "by the keeper", except on a lazy move's page, which says instead "…, worked out at the
    purse's next use" (the keeper never fires it, call 6). The MCP descriptions say the same in plain text.
11. **What the compiler refuses,** each naming the move and the reason: an anchor field the thing lacks, an anchor or
    `after` field that is not an instant, a calendar anchor with no zone, a zone the tz database does not know, and
    `by` on a move with no `from`. `ortho check` prints each of these problems, not only that the blueprint does not
    compile, so a refusal names its move wherever it is read.

12. **The server's clock is the world's, live.** K23 section 6 provides `Clock` at the entry "fixed for the whole
    request (as workerd fixes `Date` during a request)". workerd's `Date` stands still only between I/O, and a durable
    sleep is I/O: a handler that reads `Clock` after `Timers.sleep` reads the instant the sleep woke at. Within one
    step of the world's clock nothing else moves it, so a call that does not sleep reads one instant throughout. The
    generated server provides `Timers` to handlers, so a handler's durable sleep is one of the world's timers.

## Three rows that could not stand

- **No Better Auth invitation exists.** K23's evidence quotes Better Auth's organization plugin, but Orthograph never
  loads it: `bearer`, `deviceAuthorization` and `jwt` are the only plugins
  (`host-cloudflare/src/modules/auth/internal/options.ts:4`, on `main` and `goal/stage-1`). acme's invitations are its
  own things, which expire only by a declared `after`. M8.03 keeps the session.
- **The by-hand and adapter halves need stage one's harness.** A dev world with a chain, `ortho clock` and the portal's
  world bar (M8.03's by-hand half), and an adapter mounted from a package (M8.04's `clock: "own"` half) are built on
  `goal/stage-1`'s dev worlds and adapter packages (`e2e/m1/packages.ts`, `e2e/m1/adapters.ts`), which `main` does not
  have. Written now, they would copy that harness onto `main` and conflict with it when stage one lands. They become
  M8.18, written by an author once stage one's gate is on `main`, before M8.11 and M8.13 start.
- **The ratchet is a folder.** G9 (on `goal/stage-1`, 20 November 2026) made M1's list one file per check. M8 starts
  that way: `e2e/m8/expected-failing/<check>.txt`. The ratchet's code (`e2e/ratchet/`) is copied byte for byte from
  `goal/stage-1` as it stood at `bbe1a488`; stage one has changed it since (G11), and the merge of stage one into `main`
  takes stage one's side of each file.

## Evidence that the checks are fair

The pull request that lands `e2e/m8/` carries the runs: each check red on `main` for the missing surface; each half
passing against a throwaway implementation where one could be written on `main`, and each that could not named, with
why. The throwaway was deleted.

## Supersedes

- design/decisions/K23-time.md: "fixed for the whole request (as workerd fixes" → "the world's instant, live: a handler that reads `Clock` after a durable sleep reads the instant the sleep woke at"
- design/milestones.md: "Listed in `e2e/m8/expected-failing.txt`" → "Listed in `e2e/m8/expected-failing/`"
- design/milestones.md: "Better Auth refuses a session and an invitation after their life" → "Better Auth refuses a session after its life"
- design/milestones.md: "in a dev world at the default speed a transaction sent a minute after the start is mined with a block time within one tick of the world's" → "(moved to M8.18)"
- design/milestones.md: "a journey through an adapter with `clock: " → "(moved to M8.18)"
- design/milestones.md: "| M8.07, M1.30 | build" → "| M8.07, M1.30, M8.18 | build"
- design/milestones.md: "| M8.08, M8.10, M1.13 | build" → "| M8.08, M8.10, M1.13, M8.18 | build"
- design/milestones.md: "M8.02 to M8.15, M8.17 (and so M6.09, from stage 2)" → "M8.02 to M8.15, M8.17, M8.18 (and so M6.09, from stage 2)"
