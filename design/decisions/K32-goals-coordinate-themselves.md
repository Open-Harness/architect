# K32: goals coordinate themselves, through git and GitHub

21 November 2026. Decided by the conductor under AGENTS.md, "Who decides", on Aaron's direction that day: "I want to
make the plan durable on GitHub and for all agents, but I want to do some orchestration work in different harnesses at
the same time. So a lot of these new goals and stuff like that are not going to be kicked off here. They're going to be
their own thing. They need to kind of coordinate somehow, maybe through Git or something like that. Right? Or even in
GitHub milestones."

## The problem

Every goal so far reported to the 🎼 conductor by chat, asked it for decision IDs, and reached other goals through it:
Goal 3, Goal 4 and Goal 7's Foreman thread messaged one Claude Code session all day on 21 November. That breaks three
ways:

- **A chat dies with its account.** On 19 November an account switch made every session unreachable
  (`design/history/artifacts-2026-11-21/README.md`); only git and GitHub survived.
- **Other harnesses can't reach it.** Amp and Codex read `AGENTS.md` and the skills, but they cannot message a Claude
  Code session. Goal 7 ran on Codex and needed a Claude thread beside it only to relay.
- **One allocator is one queue.** Decision IDs came from the conductor's list in `design/handoff.md`, so a goal stopped
  to ask for one.

## The call

A goal runs on its own, in whatever harness starts it, and coordinates only through the repository and GitHub. The
conductor integrates; it is not the switchboard.

1. **The brief is the goal's whole context.** `design/goals/<nn>-<name>.md` holds the goal, its branch, the paths it
   owns, its done check, how it lands, and a one-line start any harness can take: "You lead Goal <n>. Read `AGENTS.md`
   and `design/goals/<nn>-<name>.md`, and run it."
2. **State lives in the goal's own files, on its branch.** The lead rewrites the brief's "Where it stands" section at
   every merge into its branch: what landed, what is open, what it waits on. Its own snags go in
   `design/goals/<nn>-snags.md`. Anyone, Aaron included, reads those files to know where the goal is.
3. **GitHub is the live surface.**
   - **A label per goal**, `goal-<n>`, on every pull request and issue of that goal.
   - **A milestone per release** (K28): `Preview`, `Beta` and `1.0`. Every goal pull request carries its release's
     milestone, so the milestone page shows what each release still waits on.
   - **A cross-goal ask is an issue** labelled with the goal that must act, naming the asker's goal and what done looks
     like, or a pull request into the owner's branch that only the owner's lead merges (a line in its snag log, a
     freeze line in its brief). A goal never pushes to another goal's branch; the owner acts, and its merge or comment
     is the answer. Each lead reads its label's open issues at every slice start and closes them with the
     pull request that answers.
4. **Decisions are named, not numbered, inside a goal.** A goal names its calls by milestone or area and a slug, as
   `M6-money`, `ST3-budgets` and `CI-drafts` already are, or `GOAL<n>-<slug>` for a call that belongs to one goal and
   no milestone (`GOAL6-theme`; not `G6-…`, since `G` is a lettered series), and records the name in its brief's
   decision list. Before
   using a name, it checks no file starts with it on `main` or any open branch
   (`git ls-tree -r --name-only origin/<branch> design/decisions/`). Lettered IDs (`K32`) stay with the conductor's
   list in `design/handoff.md`, for calls that cross goals.
5. **The conductor integrates.** It reads the labels, milestones, open issues and each goal's "Where it stands"; keeps
   `.agents/skills/kanban/STATE.md` as the index of goals and where each lives; orders merges into `main` and between
   goal branches; decides conflicts between goals, as a decision; and does the admin steps a goal can't: it cuts a new
   goal's branch and protects it like `goal/stage-1` before the lead starts, so a lead's first check (`gh api` on its
   branch's protection) passes. Messages between threads stay welcome where both can reach each other, but
   nothing may depend on them: whatever a message settles is written into a file or an issue.
6. **A goal's paths are its own.** The brief lists the packages and folders the goal owns. Touching another goal's
   path is a cross-goal ask (3), never a quiet edit.

Options weighed. A coordination service (an Orthograph app holding the board) is the Foreman's future
(`design/foreman/`), not something to wait for. GitHub Projects adds a second board beside the repository's own kanban
data with no gain. Files alone can't carry an ask across branches, since a goal can't write another goal's branch, so
issues carry asks and files carry state.

## What follows

- Goals 5 and 6 are rewritten to this in #285 by the 📐 UI thread, as the first goals started outside this session.
- The `goal-3` to `goal-7` labels and the `Preview`, `Beta` and `1.0` milestones exist (created 21 November 2026), and
  every open goal pull request carries its label and milestone. Milestone slices M1.* go to `Preview`; M2, stage 1's
  slices and staging to `Beta`; stages 2 to 4 to `1.0`.
- `goal/ui-layer` and `goal/portal` were cut from `goal/stage-1` and protected like it on 21 November 2026.
- Running goals adopt it in their own briefs, on their own branches, since only a goal edits its brief: Goal 3's lead
  rewrites `03-stage-1-hill-climbed.md` (its "report to the conductor session" lines become a "Where it stands" section
  and a paragraph on reading `goal-3` issues and pull requests at every slice, which Goal 6's cutover depends on), and
  Goal 4's lead does the same in `04-on-chain.md`. Each is asked by an issue labelled for it (#299, #300). Until then their chat
  habits may continue, provided whatever a message settles is written down.

## Supersedes

- `.agents/skills/threads/SKILL.md`: "Report to it when you finish, when you're blocked," → "A goal reports through its own files and GitHub, not to a chat (K32):"
- `.agents/skills/threads/SKILL.md`: "**Decision IDs come from one allocator.**" → "**Decisions are named, and lettered IDs come from one list.**"
- `.agents/skills/conductor/SKILL.md`: "**Hand out decision IDs from one place.**" → "**Hand out lettered decision IDs from one place.**"
- `design/handoff.md`: "**To claim one,** ask the conductor (on a goal, its lead); never mint one yourself." → "**To claim a lettered one,** ask the conductor; a goal names its own calls by milestone or area and a slug (K32)."
