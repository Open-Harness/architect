---
name: goal-4
description: How to lead or resume Goal 4 (on chain, end to end) on `goal/on-chain`, in any harness. Read it first when you take over the Goal 4 lead, when a session was compacted or moved, or when the conductor asks where Goal 4 stands. STATE.md beside it is the live state: open pull requests, who is working on what, the next step, and the lessons so far.
---

# Goal 4: leading it, and picking it up

The goal's brief is `design/goals/04-on-chain.md` on `goal/on-chain`. This skill is how its lead works, written so a
fresh agent in another harness (Claude Code, Codex, Amp) can carry on without the old conversation. **`STATE.md` is the
memory.** Read it before anything else, and update it in the same pull request as every merge.

## Resume in this order

Some files below arrive with open pull requests (`e2e/on-chain/` with #279); until they
merge, read them on their branches (`git show origin/<branch>:<path>`, branches in STATE.md).


1. `STATE.md` (this folder): where it stands, what is open, the next step, lessons.
2. `design/goals/04-on-chain.md` word for word, especially "The prompt", "The bound", "The five roles", the slice
   tables and "The done check".
3. `design/goals/04-snags.md`: every snag, and who owns it.
4. `design/decisions/M6-chain.md`: the chain decision every slice builds to (items 1 to 11).
5. `AGENTS.md`, and the `threads`, `author` and `reviewer` skills.
6. `gh issue list --label goal-4`, `gh pr list --base goal/on-chain` and `git log --oneline -15 origin/goal/on-chain`, to check STATE.md against GitHub.
   Where they disagree, GitHub is right: fix STATE.md.

## The loop, per slice

1. **Start:** read the open issues in Goal 4's milestone (Ask issues above all) and pull requests into `goal/on-chain` (K32, K33). Check `goal/stage-1` for anything that changes the plan (slice 1 waits for Goal 3's sign-in extraction,
   M2.05). Merge `origin/goal/stage-1` into the slice's first branch, by a merge, never a rebase.
2. **Decision step,** if the slice needs one: the lead writes it in `design/decisions/` (take an ID from the goal
   file's "Decision IDs" table), runs `tools/ci/supersedes.sh`, and gets a 🔍 pass.
3. **Checks first:** a checks author (never the builder) writes the slice's check as `e2e/on-chain/NN-<slice>-*.test.ts`,
   red, listed in `e2e/on-chain/expected-failing/`, on a `-check` branch, with the author skill's proofs. The prefix
   for each slice is in `e2e/on-chain/slices.json`.
4. **Hostile pass:** a separate agent tries to pass the check with wrong outputs (author proof 6). Every hole goes
   back to the checks author as a planted row. This found holes in every check so far; never skip it.
5. **🔍 review** of the checks pull request, by an agent that wrote none of it. Fix, then a fresh 🔍.
6. **Build:** a framework builder on a `-build` branch turns the check green, removing only lines from
   `expected-failing/`. At most three builders at once. Then a 🔍.
7. **Merge** when CI is green, every thread is answered and resolved, and the 🔍 passed: `gh pr merge <n> --merge`.
8. **For every merge,** in the pull request that merges, or the next one when CI-drafts folds the note in, but always
   before the next slice starts: rewrite the brief's "Where it stands" and `STATE.md`, and `design/handoff.md` if it names Goal 4. Say the slice, its
   check and its snags there and in the pull request, for Aaron's ear (K32). A message to the conductor is welcome, but
   nothing depends on it.

## How the roles were run (21 November 2026)

Side sessions could not be started from this session while Aaron was on Remote Control, so authors, the hostile pass
and reviewers ran as subagents (`Agent` tool), each in its own worktree (`isolation: "worktree"`). That keeps the roles
apart: none of them is the lead. A resumed subagent keeps its context (`SendMessage` to its id); use that to send
review findings back to the author who wrote the check. In another harness, use its own way of starting a thread (the
`threads` skill's table).

## Rules that bit, and the fix for each

- **Reviewers must not check out branches in the lead's worktree.** One did, and left it on a detached head; the next
  commit nearly went nowhere. Every reviewer brief now says: read-only, `git show` / `git diff`, or its own
  `git worktree add` under `/private/tmp`, removed after.
- **`tools/ci/supersedes.sh` runs in CI** (in the `e2e-m0` job). Run it before every push of a decision. It also reads
  the kanban snapshot (`.agents/skills/kanban/data/tasks.json`), so a superseded phrase there is amended in place too.
- **Stacked pull requests show Goal 3's Codex threads.** A pull request into `goal/on-chain` that carries a stage-1
  merge shows Codex findings on Goal 3's code. Answer each ("Goal 3's code, from the stage-1 merge; passed to the Goal
  3 lead"), resolve it (conversation resolution is required), and send it to the conductor.
- **Turn off the session's auto-archive on PR close** (`set_monitor auto_archive_on_close: false`): it was on, and the
  first merge would have archived the lead.
- **A new example must not break workspace CI.** `examples/budgets` sits in `.nxignore` until slice 12, and has a
  `pnpm-lock.yaml` importer so `--frozen-lockfile` passes.
- **CI takes 45 to 60 minutes a pull request.** Batch a pull request's fixes into one push, and work the next slice
  while it runs.
- **CI-drafts (the conductor's decision, 21 November 2026, #293).** Open every pull request as a draft: a draft runs no
  CI. Get its 🔍 and run the affected checks locally, then mark it ready, and CI runs once. Push to a ready pull
  request only to answer review or CI. Keep at most two of Goal 4's pull requests ready at once; fold small fixes
  (like STATE.md notes) into the next one.
- **Builders may only shrink `e2e/on-chain/expected-failing/`;** `tools/ci/builder-paths.sh` enforces it once #279 has
  merged.

## On GitHub (K33)

Every comment Goal 4's lead or its subagents post starts with `[goal-4 · <role> · claude · <model>]` (role: lead,
author, builder, reviewer, hostile). Pull requests carry the milestone `Goal 4: on chain, end to end`, the labels `goal-4`,
`release:1.0`, `role:<role>`, `harness:claude`, and the template's "Harness and model" line. A new snag is a Snag
issue in the milestone. When an agent takes a slice, it comments on the slice's issue: "Taking this: claude, <model>,
<role>" (K33 item 4). The brief's front matter is what `tools/github/sync.mjs` reads; keep `status` and `lead`
current.

## Talking to Aaron

He listens by text-to-speech. Answer first, plain short sentences, no tables or symbols in the spoken part, numbers and
links at the end. Never a bare ID: say what a snag or pull request does. Ask him only when truly blocked (`AGENTS.md`).
