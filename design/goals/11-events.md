---
goal: 11
title: events in and out
milestone: "Goal 11: events in and out"
release: "1.0"
branch: goal/events
base: goal/stage-1
status: parked         # ready | running | landing | done | parked
lead:
  harness: amp          # claude | codex | opencode | amp, set by the lead when it starts
  model: gpt-6.2-sol     # the model id it runs on
  since: 2026-11-22     # the date it started
done_check: nx run e2e:events
owns:
  - packages/orthograph/src/modules/events/
  - packages/host-cloudflare/src/modules/events/
  - packages/host-cloudflare/src/modules/outbox/
  - e2e/events/
  - design/decisions/M5-reach-out.md
  - design/goals/11-events.md
slices:
  - "1 · Views, the outbox and waiting on outside events, decided"
  - "2 · Journeys for payments and notifications (after 1)"
  - "3 · Events in: signed doors and `on:` (after 1)"
  - "4 · The outbox for every move (after 3)"
  - "5 · `emits:` on an operation (after 1)"
---
# Goal 11: events in and out

Branch `goal/events`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 11: events in and out`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 11. Read `AGENTS.md` and
`design/goals/11-events.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Let an app react safely to events from outside, and send its own events out without ever losing one.
- **Why:** Payments arrive as webhooks, a wallet's transfers arrive as chain events, and other systems need to hear what the app did; each must count once and never be dropped.
- **When it's done, you can:** send the same webhook twice and see it settle once, kill a delivery halfway and see it delivered once after restart, and see a refused call send nothing.
- **It is:** a way to declare what the app does when an event arrives, doors that check an event really came from its sender, and an outbox that keeps every event the app sends.
- **It isn't:** Stripe, email or any real vendor (those adapters come later), or the views that rebuild data from events.
- **Done when:** its tests pass: duplicates settle once, deliveries survive a crash, and events go out only when a call succeeds.
- **Waits on:** nothing to start the checks. The signed-door build waits for Goal 3's service principal.
- **Words used:** an outbox: a list of events kept with the data they describe, so they go out at least once. A door: the address an outside system calls.

## Read first

- K5 (Q5, `emits:`) in `design/decisions/`, the outbox and views (S22, S24, as the M5.01 row cites them), and the M5.01 to M5.04 and M3.16 rows of
  `design/milestones.md`.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | Views, the outbox and waiting on outside events, decided | M5.01 | — | — |
| 3 | Events in: signed doors and `on:` | M5.03 | 1 | Goal 3's service principal, M2.03 (#297), for the build |
| 4 | The outbox for every move | M5.04 | 3 | — |
| 2 | Journeys for payments and notifications (later, Aaron 22 November) | M5.02 | 1 | after the beta |
| 5 | `emits:` on an operation (later, Aaron 22 November) | M3.16 | 1 | after the beta; the shape of a workflow, M3.01 (Goal 8) |

**Aaron's call, 22 November 2026:** un-park Goal 11 and run slices 1, 3, then 4. Slices 2 and 5 wait until after
the beta. Land slice 3 early for the wallets goal (K38, #477) before starting slice 4. The signed-door checks include
a GitHub-style webhook: HMAC-SHA256 over the raw body and an event id for idempotency. Aaron writes his own adapter;
Goal 11 ships no GitHub adapter. Slice 2's later payment journeys use a stand-in adapter, not the real Stripe adapter.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. `on:` and `emits:` go in a new `events` module of `orthograph`, added only (map rule 2); the host's door and outbox are new modules of `host-cloudflare`, which Goal 3 owns until auth leaves the host and Goal 4 after: tell both by an Ask issue before slice 3 builds.

**Done check:** `nx run e2e:events` passes on `goal/events`. It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/events`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
  Merge `origin/goal/stage-1` in at the start of every slice, by a merge, never a rebase, and never push to another
  goal's branch. Goal 3 owns `goal/stage-1` and never waits on you; resolve conflicts on your side.
- **Checks first.** For each slice, an author who is not the builder writes the journeys and checks on a `-check`
  branch, red on empty handlers, and proves them fair (the `author` skill). The builder then makes them green on a
  `-build` branch and never edits them.
- **Merging.** Open pull requests as drafts, test locally, get a 🔍 pass from a reviewer that wrote none of it (the
  `reviewer` skill), then mark ready; merge when CI is green and every thread is resolved. At most two ready pull
  requests in CI at once.
- **Its needs.** A slice builds once what it needs has landed (K34, `design/goals/map.md`). A slice that needs another
  goal's work writes its checks first and waits for the build; it never builds a stand-in for the other goal.
- **Asks.** Anything outside "What it owns" is an Ask issue in the owning goal's milestone, naming this goal and what
  done looks like (K32, K33). Read this goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 11: events in and out` and the label `release:1.0`;
  every comment an agent posts starts `[goal-11 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M5-<slug>` or `GOAL11-<slug>` (K32).
- **Limits.** No cloud and no keys. Stop every process you start, by its id, before you report.

## Where it stands

**Parked on 23 November 2026 under K42** (section 7: "11 · Events | nothing in review | parked; #498 stays a draft").
Its open slices go back to the board as items at their stage; no lead holds them.

- **Landed on `goal/events`:** the base merge from `goal/stage-1` (#454) and slice 1, the decision on doors, the inbox,
  `on:`, the outbox, views and workflow events, `design/decisions/M5-reach-out.md` (#479, merge `8d13eca3`). #387 is
  closed. Codex's last pass on #479 was still running at the merge (Codex is advisory); a finding that arrives after
  it is answered in the next pull request on this design.
- **Open, as board items:**
  - Slice 3, events in (#389): signed doors, including the GitHub-style webhook (HMAC-SHA256 over the raw body, an event
    id for idempotency), and `on:`. Nothing written. Goal 3's service principal (M2.03, #297) has landed on
    `goal/stage-1`, after `goal/events`' last base merge; its build needs that merged in and the engine seams asked in #480. Goal 12 asked for it early (#477).
  - Slice 4, the outbox for every move (#390): after slice 3; seams in #480.
  - Slice 2, journeys for payments and notifications (#388): after the beta (Aaron, 22 November). Draft #498 holds
    `design/decisions/M5-checks.md`, a `builder-paths` change making `e2e/events/expected-failing/` shrink-only, and
    unrun, unreviewed checks under `e2e/events/` that slice 3's checks can start from.
  - Slice 5, `emits:` on an operation (#391): after the beta; needs Goal 8's workflow decision (#462).
- **Asks still open:** #480 (Goal 3, the engine seams), #481 (Goal 4, the follower through `Inbox.accept`), #462
  (Goal 8, M3.01 early). #501 passed a Codex finding on Goal 3's staging code to Goal 3.
- **Next, for whoever takes slice 3:** merge the integration branch in, write the signed-door and `on:` checks from
  #498's start, then build once the #480 seams have landed, and land it early for Goal 12.
