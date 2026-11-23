# Where Orthograph stands

The conductor's state, written so that a fresh session (on this account or another one) can pick up the work without
the old conversations. Snapshot of 21 November 2026, 11:00 UTC, by the 🎛 conductor (first written 09:35); the lanes rewritten on 22 November. Written because the week's Claude
usage was 71% spent and the work may move to another account. Sessions, Remote Control and claude.ai artifacts do not
move with the account. The repository does, so everything needed is here or linked from here.

## Pick up from here

1. Open a session in a fresh worktree of `Open-Harness/orthograph` from `main`. Read `AGENTS.md`, this file,
   `docs/canon/status.md` (what is built and what is left), `design/decisions/K28-releases.md` (the three releases), and
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
code allows. Narrowed on 22 November: see "The lanes".

## The lanes

**22 November 2026: narrowed to the critical path** (Aaron: "Narrow to the path"). The Beta path and the two long
poles run at full speed; the other goals finish the slice they were on, set `status: parked` in their brief and stop,
and resume by the conductor's word. Each goal's own state is its brief's "Where it stands", on its branch, and its
GitHub milestone (K32, K33); read those before this table, which is only the index.

| Goal | Branch | Role now | Note |
|---|---|---|---|
| 🎯 3: stage 1 of Plugged In | `goal/stage-1` | **Beta path, the spine** | Staging fully green on 21 November (run 3, https://github.com/Open-Harness/orthograph/actions/runs/44940466011: the story passed against the deployed Worker, then destroyed clean). Monitor (M1.49) merged; principals and agent keys (#297) next |
| 🎯 5: the UI layer | `goal/ui-layer` | **Beta path** | Started 22 November; uses UI SDK's default tokens until Goal 6's theme lands (K38) |
| 🎯 6: the new portal | `goal/portal` | **Beta path** | Started 22 November; lands the theme early (K38), then the map language (with K36's components), the shell, and the cutover off HeroUI |
| 🎯 15: release and the cloud | `goal/release` | **Beta path** | Aaron granted all eight credentials of the release pass (M7.13) on 22 November; the goal asks him directly for each step he must do himself |
| 🎯 4: on chain | `goal/on-chain` | **Long pole** | Stalled about a day, resumed on 22 November: #331 merging stage-1 in and answering its last Codex finding. Lands M6.09 early for Goal 9 (#442, agreed) |
| 🎯 9: time | `goal/time` | **Long pole** | Lands M8.09 early for Goal 4 (#443) |
| 🎯 7: Safe, Hats and budgets | `goal/safe-hats` | Open | #294 is blocked, not merged, since 21 November; its done check passed earlier. Needs a lead to land it |
| 🎯 8 workflows, 10 agents, 11 events, 12 wallets, 14 club, 16 Capxul | their `goal/<name>` branches | **Parking** after their current slice | Started 22 November; each will set `status: parked` and say in "Where it stands" where it stopped |
| 🎯 13: the vault | `goal/vault` | Not started | Waits on Goal 4's M6.01, Goal 7's ST3.01 and Goal 8's M3.01 |

Decisions of 21 to 22 November that every lead reads on `main`: K36 (composite components declare their wiring),
K38 (a slice another goal needs lands early, by a branch cut at its commit and merged by a merge commit). K37 is
reserved for the 📚 canon thread, whose map (a Whiteboard artifact) waits on Aaron's yes to its settled clashes and
its retire, merge or keep list.

## Other threads

- 🧪 Durable workflows on Cloudflare (M3.03): **done, on `main`** (#289). Effect's workflows replay without redoing
  finished steps, wait on events, ignore duplicate wake-ups, and a 30-day wait follows a test world's clock through the
  world's timers. It answers stage 3's signature collection and the keeper.

- 🗺 The walkthrough board (Aaron's "1 board, 6 zones"): the pitch, the concept map, the tour, swap the example, UI,
  hard questions; each card tinted by the scope map (now `docs/canon/status.md`). Built; zone 5 (UI) is being filled by the UI thread. Snapshot in
  `design/history/artifacts-2026-11-21/walkthrough-board.data.json` (open with `design/history/artifacts-2026-11-21/_whiteboard-shell.html`).
- 📐 The UI thread: K29 (#272), K31 and Goal 6's brief (#285). Both goals started on 22 November.
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

Next free in `design/handoff.md`. On `main`: K28 (releases), K29 (UI layer), K30 (the model and
the map), K31 (the app map), K32 (goals coordinate themselves), K33 (GitHub-native work) and K34 (goals by needs, the goal map); K35 (Goals 8 to 16 briefed) is on `main`; K36 (composite components declare their wiring) is on `main`; K37 is reserved for the canon thread, K38 (early landing) is on `main`; the next free K is K39. Slice IDs given out on 21 November: M1.51 (the npm preview, in `milestones.md`);
ST1.25 (the web projection), ST1.26 (its checks), ST1.27 (retire the old portal client at cutover) and ST1.28 (check 15
rewritten), held only in this file until #272 writes them into `milestones.md`.

## Standing rules that bite

All of `AGENTS.md`, and especially: Aaron listens rather than reads (plain words, no bare IDs, pull request links);
never print, copy or write a key; never create a cloud credential without his written yes; at most $10 a day on cloud;
destroy every world, stage and site you make, touching only Orthograph-prefixed resources; no local Docker; stop only
your own processes, by PID; no attribution lines in commits, pull requests or comments; pins exact and at least three
days old. Aaron's standing authority (21 November): "anything that's waiting on me, just go with the recommendations.
You have authority." That covers design calls, not money, credentials, production or anything outward-facing.
