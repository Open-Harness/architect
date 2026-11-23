# The goals

Rewritten 23 November 2026 by K42 (`design/decisions/K42-goals-are-agents.md`), with Aaron. A goal is one
long-running agent: today a thread in Claude Code, Codex, OpenCode or Amp that manages other threads, later a
superagent. A goal exists while its agent runs. The map of 21 November, with seventeen goals and the needs between them,
is kept in git: `git show 990d4a17:design/goals/map.md`. Its needs move onto the board with Goal 18's slice 2.

## The running goals

| Goal | Kind | What it builds | Brief |
|---|---|---|---|
| 18 · The framework | framework, always running | the engine and every package no app goal has claimed, the board, the roadmap and the releases; it ranks what can run now and starts it | `18-framework.md` |
| 19 · The lander | landing, always running | nothing new: it brings each app's green slices into `main` as reviewed pull requests, and keeps `main` green | `19-lander.md` |
| 17 · The superagent | app, first | an always-on agent stored as data, and most framework pieces the two apps share (K39, K40, K42); its coding agent then helps build Capxul. What it proves is the beta | `17-superagent.md` |
| 16 · Capxul core | app, the north star | Capxul as one product on Orthograph: the books, HR and payroll in ERPNext's shapes, then the CRM; Bridge; the paid services (K43). What it proves is 1.0 | `16-capxul.md` |

Every other goal is winding down (K42, section 7). Each lands the pull request it has in review, rewrites "Where it
stands", sets `status: parked` and stops. Its open slices become items on the board.

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

The two apps split the pieces they share: each goes to the app that needs it first in the order they run, and the
superagent runs first (K42, section 3). Organisations are not shared; each app has its own.

## Into `main`

App work stays on its goal's branch. The lander (Goal 19) brings each green slice into `main` as a reviewed pull
request, merged by a merge commit, and tells the running goals. Each merges `main` in at its next slice start and
never rebases a shared branch (K42, section 8). Some merge cost is accepted, in exchange for running more in parallel.

## Starting a goal

Goal 18 writes the brief in K33's shape: front matter, the plain goal card, the slices, the done check and a one-line
start. The sync gives it a milestone, a goal issue and a sub-issue per slice. Aaron then starts it in any harness: "You
lead Goal <n>. Read `AGENTS.md` and `design/goals/<nn>-<name>.md`, and run it."
