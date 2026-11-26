# The goals

Rewritten 23 November 2026 by K42 (`design/decisions/K42-goals-are-agents.md`) and 25 November by K44 (`K44-two-builds.md`), with Aaron. A goal is one
long-running agent: today a thread in Claude Code, Codex, OpenCode or Amp that manages other threads, later a
superagent. A goal exists while its agent runs. The map of 21 November, with seventeen goals and the needs between them,
is kept in git: `git show 990d4a17:design/goals/map.md`. Its needs move onto the board with Goal 18's slice 2.

## The running goals

| Goal | Kind | What it builds | Brief |
|---|---|---|---|
| 18 · The framework | framework, always running | the Orthograph alpha, the npm preview: TypeScript end to end, the chain basics, a command that creates an app, publishing that works (K44); and the board, the loop that ranks what runs next, collisions and grills (K42) | `18-framework.md` |
| 16 · Capxul core | app, the north star | Capxul as one product on Orthograph: the books in double entry, HR and payroll in ERPNext's shapes, then Bridge, budgets and the Safe (K43, K44). What its books, HR and payroll prove is the beta | `16-capxul.md` |
| 19 · The lander | landing, always running | nothing new: it brings Capxul's green slices into `main` as reviewed pull requests, and keeps `main` green | `19-lander.md` |

Two things are built now (K44): the alpha, by the framework goal, and Capxul. The superagent (Goal 17) is parked, and
every goal K42 stopped stays parked (K42, section 7). Each goal K42 stopped landed the pull request it had in review,
rewrote "Where it stands", set `status: parked` and stopped; the superagent's pull requests stay open and unmerged
(K44, section 5). A parked goal's open slices become items on the board.

## Where everything is: the handoff of 26 November 2026

The week's usage was nearly spent on 26 November, so every lane landed what was green and wrote down where it stands.
Any harness (Claude Code, Codex, Amp, OpenCode, another account) resumes a goal from the repository alone, with the
line in "Starting a goal" below. Read the brief's "Where it stands" first: its newest entry is that lane's handoff.

| What | Branch | Brief, and its newest entry | How it reaches `main` |
|---|---|---|---|
| Goal 18, the framework: the alpha, then publishing under `next` | `main`, `goal-18/*` | `18-framework.md`: slices 1 to 10 landed; 11 in review (#1145); 12 waits on Aaron's npm names and token | its own pull requests |
| Goal 16, Capxul: the books, HR and payroll, then the Safe, the keeper, Bridge and contractors | `goal/capxul`, `goal-16/*` | `16-capxul.md`, the money lane's and the features lane's handoff entries | the lander, Goal 19 |
| Goal 16's framework gaps (1 to 7: #1079, #1132, #1133, #1134, #1135, #882, #1136) | `main`, `goal-16/snag-*` | `16-capxul.md`, the features lane's entry. Gap 1's build (#1176) and the snag queue belong to the Goal 16 lead run in Amp | their own pull requests into `main` |
| Goal 16's US payroll tax lane, run in Amp | `goal/capxul`, `goal-16/tax-us-*` | its lane brief (#1131) and #1180 | the lander |
| Goal 19, the lander | `goal-19/*` | `19-lander.md`; #1156 brings `goal/capxul` into `main` | itself |
| Goal 17, the superagent | `goal/superagent` | `17-superagent.md`: parked | parked |

Pull requests into `main` from other Claude sessions, outside the goals: the `claude/*` builds #1183, #1185, #1188 and
#1202 (journeys, `prove --only`, a rule's refusals); the manual and its films, #1100, #1192 and #1211; the Coworker audit,
#1179, which waits on Aaron's answer to K47 (a third build). Each is finished or closed by whoever resumes it, by the
usual rules.

Where to look: the board is `docs/canon/status.md`, written to one issue per row and to the Project
(https://github.com/orgs/Open-Harness/projects/1) by `tools/github/sync.mjs`. Decisions are in `design/decisions/`, and
the register is `design/handoff.md` (next free K48). Aaron's open questions are Decision issues labelled `needs-aaron`.

One call of Aaron's on 26 November is not yet a decision record: open pull requests ready, not as drafts, and the lead
lands them. Until a decision supersedes `design/decisions/CI-drafts.md`, `AGENTS.md`'s draft rule stands as written.

## How a piece of work moves

Provisional, spiked, scaffoldable, building, built, extracted (K42, section 2). An unknown only Aaron can settle is a
grill: a Decision issue labelled `needs-aaron`, which Goal 18 brings to him and turns into a decision every running goal
hears.

## The collision rule

An app goal owns every gap it finds, big or small. Before starting one, it reads the claims on the board:

1. **A running goal has claimed it, or it is in a slice a running goal has scheduled.** Wait for it, or take the part
   that has landed. A stopped goal's slice is not scheduled: the app goal that needs it takes it.
2. **It would change paths another running goal has claimed.** Settle it through Goal 18: one of them does it, or they
   split it.
3. **Neither.** Claim it (the `lane:goal-<n>` label on its issue, and a "Touches" line naming the paths) and build it
   in this goal's own slice.

Capxul is the one app building now (K44), so no piece is split between two apps. A framework gap belongs to the goal
that claims it first: Capxul builds the gaps it has claimed, and the framework goal builds the unclaimed ones any
TypeScript app hits, for the alpha (K44, section 1).

## Into `main`

App work stays on its goal's branch. The lander (Goal 19) brings each green slice into `main` as a reviewed pull
request, merged by a merge commit, and tells the running goals. Each merges `main` in at its next slice start and
never rebases a shared branch (K42, section 8). Some merge cost is accepted, in exchange for running more in parallel.

## Starting a goal

Goal 18 writes the brief in K33's shape: front matter, the plain goal card, the slices, the done check and a one-line
start. The sync gives it a milestone, a goal issue and a sub-issue per slice. Aaron then starts it in any harness: "You
lead Goal <n>. Read `AGENTS.md` and `design/goals/<nn>-<name>.md`, and run it."
