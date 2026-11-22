# Where Orthograph stands

The conductor's state, written so that a fresh session (on this account or another one) can pick up the work without
the old conversations. Snapshot of 21 November 2026, 11:00 UTC, by the 🎛 conductor (first written 09:35). Written because the week's Claude
usage was 71% spent and the work may move to another account. Sessions, Remote Control and claude.ai artifacts do not
move with the account. The repository does, so everything needed is here or linked from here.

## Pick up from here

1. Open a session in a fresh worktree of `AaronAbuUsama/architect` from `main`. Read `AGENTS.md`, this file,
   `design/scope.md` (what is built and what is left), `design/decisions/K28-releases.md` (the three releases), and
   `design/handoff.md`.
2. You are the 🎛 conductor (`.agents/skills/conductor/`, `.agents/skills/threads/`). List the open pull requests
   (`gh pr list`) and compare them with "The lanes" below. A lane whose lead is gone is restarted from its brief, as
   that lane's row says. Each lead keeps its own state in its goal's files on its branch, so read that first.
3. Snapshots of the claude.ai pages (the walkthrough board, the scope page, the to-do page, the grills, and the big map of every goal and branch, `big-map.html`) are in
   `design/history/artifacts-2026-11-21/`. Republish any you need on the new account. The repository's design files stay the source of
   truth; the snapshots are pictures of them.

## The releases (K28, Aaron, 21 November)

- **Preview:** Gate M1 on `main`, and `@orthograph/*`, `orthograph` and the preset on npm under `next` (M1.51; Aaron
  runs `npm publish`). Goal 3's branch lands on `main` mid-goal once Gate M1's slices are green.
- **Beta** (stage 1, "workable"): Gate M2 and Goal 3's done check, staging included.
- **1.0:** the beta, then stages 2 to 4 and the release slices.

Aaron's aim (21 November): in about 72 hours, be ready to rebuild Capxul from the ground up on Orthograph, in
composable pieces (plugins) that another app (Plugged In, the link-in-bio app) also uses. So: parallelise wherever the
code allows.

## The lanes

Every lane runs as a goal: one lead, one branch, one done check, merged by pull requests that pass CI, have every
thread resolved and a 🔍 reviewer that wrote none of it. Leads merge `goal/stage-1` in at every slice start, never
rebase, and never push to another lane's branch.

| Lane | Branch | Brief (read it word for word) | Done check | Where it stood |
|---|---|---|---|---|
| 🎯 Goal 3: stage 1 of Plugged In (the beta, critical path) | `goal/stage-1` | `design/goals/03-stage-1-hill-climbed.md` | `nx run e2e:stage1`, staging included | 7 of 7 journeys green and a required check. Merged today: M2.01 (people, roles, auth and organisations), S-27, the chains page (M1.39), the checks for S-33 and S-34 (#278). In flight: main merged in with the draft guards on its branch-only jobs (#277); the compiler fixes for S-33 and S-34, ready (#288); six reviewed drafts waiting for CI (#267, #280, #281, #290, #291, #292); staging up and destroy reworked on **Alchemy** (#282, `alchemy` 2.0.0-beta.87 pinned), whose first live staging run has the conductor's go after its 🔍; an Effect bump to 4.1.4 that Alchemy needs, landing on `main` first on its own (#295, `chore/effect-4.1.4`) |
| 🎯 Goal 4: on chain, end to end (1.0) | `goal/on-chain` | `design/goals/04-on-chain.md` on its branch, and the lead's own skill and state (#284) | `nx run e2e:on-chain` in CI | Start-up, the chain decision, budgets journeys and the red done check merged. Open: the money decision (#287), the lead's state (#284), slice 3's checks (#283, failed review: no throwaway build has shown they can pass). Its seam slice waits for Goal 3's M2.05. It has read Goal 7's spike: nothing in its plan changes; the hat-wearer spender is a stage 3 call |
| 🎯 Goal 5: the UI layer (generated pieces on UI SDK) | `goal/ui-layer`, from `goal/stage-1` | `design/goals/05-ui-layer.md` (in #272) | in the brief | Not started. K24 is on `main`; K29 (#272) is in CI. Start its lead when #272 is on `main` |
| 🎯 Goal 7: Safe, Hats and a budgets module (stage 3, the base for Capxul) | `goal/safe-hats`, from `main` | `design/goals/07-safe-hats.md` | a 🔍 reviewer runs `spikes/safe-hats-module/run-all.sh` from a clean checkout, all green | **Done check passed** in the Foreman thread's 🔍 run (all eight steps, from a clean clone); #294's own verdict comment and the goal file's "Where it stands" still to follow. Run on Codex headless, steered by the Foreman thread; Codex is stopped. Lands by #294. Holds the hat budgets module, its fuzz, an Anvil run and a draft decision, `ST3-budgets.md` |
| 🎯 Goal 6: the new portal (our components, the app map) | `goal/portal`, from `goal/stage-1` | `design/goals/06-portal.md` (in #285) | `nx run e2e:portal-next` | Not started. K31 (#285) goes ready after #272. Start its lead when #285 is on `main` |

How Goals 5 and 6 meet the others (agreed 21 November):
- Goal 6 owns the Orthograph theme package (its first slice) and the app-map language. Goal 5 owns actions and
  `@orthograph/web`, and uses UI SDK's default tokens until the theme lands. Neither edits the other's packages.
- The app-map language is additive: new modules only in `orthograph` and the compiler, with byte-identical output for
  any blueprint that declares no app or pages, and a check that proves it.
- The new portal is a new package, `packages/portal-next`, reading the same data API. Every portal check runs against
  both clients, and the new client's failures sit in `e2e/portal-next/expected-failing.txt`, a list that may only
  shrink. When it is empty, the conductor and Goal 3's lead agree a freeze, and one cutover pull request into
  `goal/stage-1` swaps the assets, deletes the old client and HeroUI, and needs Goal 3's lead's yes.
- Goal 5's screens are part of Goal 3's done check. Its sign-in piece waits for the auth plugin (M2.05).

## Other threads

- 🧪 Durable workflows on Cloudflare (M3.03): **done, on `main`** (#289). Effect's workflows replay without redoing
  finished steps, wait on events, ignore duplicate wake-ups, and a 30-day wait follows a test world's clock through the
  world's timers. It answers stage 3's signature collection and the keeper.

- 🗺 The walkthrough board (Aaron's "1 board, 6 zones"): the pitch, the concept map, the tour, swap the example, UI,
  hard questions; each card tinted by `design/scope.md`. Built; zone 5 (UI) is being filled by the UI thread. Snapshot in
  `design/history/artifacts-2026-11-21/walkthrough-board.data.json` (open with `design/history/artifacts-2026-11-21/_whiteboard-shell.html`).
- 📐 The UI thread: K29 (#272), K31 and Goal 6's brief (#285). Hands both goals to the conductor to start.
- 🧭 "What Orthograph is": done, on `main` (#185, K30, and the goal in `README.md`).
- ✍ Time checks: done (#213 and its follow-up #274 merged).
- Done and merged on 21 November: the scope map and K28 (#262), Foreman v0 (#187), the first spike (#215), time checks
  (#213), K24 UI SDK (#217), this file (#286), CI-drafts (#293), the model guide (#185), the workflows spike (#289).

## Waiting on Aaron

- **CI capacity:** strict is off on `main` and drafts run no CI (CI-drafts, #293). Still his call: GitHub Pro (about $4 a
  month), and an AWS spot runner built with Alchemy (about $2 to $3 a day; needs his written yes for a credential). The
  conductor advised a day of batching first.
- **24 unfinished branches** (never merged, 16 to 20 November) are listed in `design/history/artifacts-2026-11-21/big-map.html`;
  they go only on his yes.
- **Money in the blueprint** (Goal 4's grill, ledger THI-07): answered by the conductor under his authority, all A
  (every amount names its asset, assets are tokens or ISO currencies, base units everywhere and formatted only at the
  faces, unsigned unless a field opts in, built now in Goal 4's slice 3). If Aaron answers the grill himself before slice
  3's builder starts, his answer wins.

## CI capacity (21 November)

The repository is public, so GitHub's runners are free with unlimited minutes; the limit is 20 jobs at once on a free
account, and each pull request runs about ten. Measured: about 800 job-minutes an hour across the lanes, and in one hour
33 of 54 pull request runs were cancelled because a newer commit or a base merge replaced them.

- **Blacksmith does not fit.** It works only on GitHub organisations, not personal repositories, and its free 3,000
  minutes a month would last about four hours at our rate; paid, it would be about $50 a day, over the $10 cap. Moving the
  repository to the Open-Harness organisation (free plan) gains nothing on GitHub's own runners either: an organisation
  on the free plan also gets 20 jobs at once.
- **Done, for free (21 November):** `main` no longer requires up to date, and a draft runs no CI: a pull request is
  tested locally, passes its 🔍 as a draft, then is marked ready and runs CI once, at most two ready per lane
  (`design/decisions/CI-drafts.md`). Measured before: 37% of job-minutes went to cancelled runs.
- **What helps, for a little money:** GitHub Pro on Aaron's account (about $4 a month) doubles it to 40 jobs at once.
  An own runner on AWS spot, declared with Alchemy, would be about $2 to $3 a day.

## Branches (cleaned 21 November)

Every branch already inside `main` or a goal branch was deleted: 257 on GitHub (301 → 44, then two new branches since) and 321 on the Mac (481 → 160);
their names and tips are recorded in the conductor's scratchpad only, and any can be restored from its merged pull
request. What is left: the integration branches (`main`, `goal/stage-1`, `goal/on-chain`, `goal/safe-hats`, `m1`), the
heads of open pull requests, and 24 never-merged branches kept for Aaron's yes. Local branches still checked out in a
thread's worktree stay until that thread's worktree is cleaned.

## Decision IDs

Next free in `design/handoff.md`; reserved and in flight: K28 (releases, merged), K29 (UI layer, #272), K30 (the model and
the map, merged), K31 (the app map, #285). K32 (goals coordinate themselves) and K34 (goals by needs, the goal map) are merged, and K33 (GitHub-native work, #301) is reserved; K35 (Goals 8 to 16 briefed) is on `main`; the next free K is K36. Slice IDs given out on 21 November: M1.51 (the npm preview, in `milestones.md`);
ST1.25 (the web projection), ST1.26 (its checks), ST1.27 (retire the old portal client at cutover) and ST1.28 (check 15
rewritten), held only in this file until #272 writes them into `milestones.md`.

## Standing rules that bite

All of `AGENTS.md`, and especially: Aaron listens rather than reads (plain words, no bare IDs, pull request links);
never print, copy or write a key; never create a cloud credential without his written yes; at most $10 a day on cloud;
destroy every world, stage and site you make, touching only Orthograph-prefixed resources; no local Docker; stop only
your own processes, by PID; no attribution lines in commits, pull requests or comments; pins exact and at least three
days old. Aaron's standing authority (21 November): "anything that's waiting on me, just go with the recommendations.
You have authority." That covers design calls, not money, credentials, production or anything outward-facing.
