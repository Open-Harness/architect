---
name: github
description: How Orthograph's work lives on GitHub (K33), for every agent in any harness. A milestone per goal; issue kinds (goal, slice, snag, ask, decision, gap) as native types with kind labels and forms; release, role and harness labels; the pull request template; review nits; the ledger; and tools/github/sync.mjs, which mirrors the goal briefs' front matter onto GitHub. Read it before you open an issue or a pull request, start or finish a slice, log a snag, ask another goal for something, or pick up a ledger row.
---

# Orthograph on GitHub

> **K42 (23 November 2026) changes three things here**, and Goal 18's slice 2 rewrites this skill to match. A gap is
> **claimed**, not asked for: the `lane:goal-<n>` label on its issue and a "Touches" line naming its paths; an Ask is
> only for two goals' overlapping claims. The board's truth becomes the capability map in `docs/canon/status.md`, one row per item with its stage
> (provisional, spiked, scaffoldable, building, built, extracted). Milestones become the apps' milestones (the
> superagent's coding agent, triage agent, extraction and launch; Capxul's getting paid, books, people and payroll,
> banking), a framework piece taking the milestone of the first app milestone that pulls it. The release labels name
> framework releases: the beta is what the superagent proves, 1.0 what Capxul core proves. The roadmap's dates are
> computed, and the lander (Goal 19) brings app work into `main` (K42, sections 5, 6 and 8). Until that slice lands, the sync below runs as it is.

The files are the truth and GitHub is where the work is seen ([K33](../../../design/decisions/K33-github-native.md),
on top of [K32](../../../design/decisions/K32-goals-coordinate-themselves.md)). Every agent here, whatever its harness,
works under one GitHub account, so who did what is said by labels and the template, never by an assignee.

## The map

| Thing | On GitHub | Made by |
|---|---|---|
| A goal | a **milestone** `Goal <n>: <title>` and the label `goal-<n>` on everything of it, and a **goal issue** (type Goal, `kind:goal`) | `tools/github/sync.mjs`, from the brief's front matter |
| A slice | a **sub-issue** of the goal issue (type Slice, `kind:slice`), **blocked by** the slices it comes after | the sync, from the brief's `slices:` |
| A snag (your goal's own) | an issue, type Snag, `kind:snag`, your milestone | you, with the Snag form |
| An ask to another goal | an issue, type Ask, `kind:ask`, **the acting goal's** milestone | you, with the Ask form |
| A decision to make | an issue, type Decision, `kind:decision` | you, with the Decision form |
| A ledger row being worked | an issue, type Gap, `kind:gap`, titled with its ledger id | you, with the Gap form |
| A release (K28) | a label: `release:preview`, `release:beta`, `release:1.0` | the sync |
| Who did it | labels `role:<role>` and `harness:<harness>`, and the template's lines | you, on every pull request |
| What waits on what | a **blocked-by** link from the slice to the snag or ask that stops it | you (below) |
| Blocked | the label `blocked`, and `needs-aaron` when only Aaron can unblock it | you |
| Where a goal is | the **goal issue's body**: card, progress, snags, waits, lead, "Where it stands" | the sync, rerun by the `goals` workflow |
| Every goal at once | the **"Orthograph" Project**: a view per goal, "All goals", and a board "By status" | the sync, `--project` |

Each kind is its own issue type once the repository is in an organization (K33, 2A); until then the nearest native type
stands in (Feature for a goal, Bug for a snag, Task for the rest). Filter by the `kind:` label either way: it is on
every issue of a kind, before and after the move. GitHub allows one milestone per issue, so the milestone says which goal and the release is a label. The `goal-<n>` label
mirrors the milestone, so a list of pull requests filters by goal too. A model is never a label (models change weekly):
it goes in the pull request's "Harness and model" line and the brief's `lead:`.

## A goal's brief

A brief (`design/goals/<nn>-<name>.md`) opens with front matter, which the sync reads:

```yaml
---
goal: 6
title: the new portal, on our own components and the app's map
milestone: "Goal 6: the new portal"
release: beta                 # preview | beta | 1.0
branch: goal/portal
base: main
status: running               # ready | running | landing | done | parked
lead:
  harness: amp                # claude | amp | codex | opencode
  model: claude-opus-5-5      # the model id the lead runs on
  since: 2026-11-22
done_check: nx run e2e:portal-next
owns:
  - packages/theme/
slices:
  - "1 · The theme"
  - "2 · The checks"
  - "3 · The map language (after 2)"   # the sync links 3 as blocked by 2
---
```

Right after its start line comes the **plain goal card**, the first thing a person or a cold agent reads, copied word
for word to the top of the goal issue:

```md
## The goal, in plain words

- **In one sentence:** Build a new portal from our own parts and swap it in for the old one, without losing anything
  the old one does.
- **Why:** …
- **When it's done, you can:** …
- **It is:** …
- **It isn't:** …
- **Done when:** …
- **Waits on:** …
- **Words used:** the portal: the web page every project gets for looking inside it. …
```

Write it for someone who has read nothing else: no ids, no file paths, no term it doesn't explain, about twenty lines
at most. The details stay below it, for the lead. A 🔍 reviewer reads the card alone and says whether it makes sense.

The lead sets `lead:` and `status:` when it starts and whenever they change, in the pull request that changes them;
that is how anyone can see which harness and model runs which goal. Only the parser's subset is allowed: `key: value`,
`key: [a, b]`, a block list of `- item`, and one level of nested map. The sync refuses anything else.

## The sync (one run at a time)

```bash
node tools/github/sync.mjs                 # what it would do (a dry run, the default)
node tools/github/sync.mjs --apply         # do it
node tools/github/sync.mjs --goal-branches # also briefs that live only on their goal branch
node tools/github/sync.mjs --brief origin/goal/on-chain:design/goals/04-on-chain.md   # one named brief
node --test tools/github/sync.test.mjs     # its tests
```

It makes the labels, a milestone per goal, the goal issue, a sub-issue per slice and the blocked-by links for the
slices' order, and writes the goal issue's body as the goal's page. It finds its issues by a marker in their body
(`<!-- orthograph:goal=6 -->`), never by title, takes only issues the owner, a collaborator or the workflow opened,
and never deletes anything. You rarely run it: the `goals` workflow runs it, one run at a time, when a brief changes
on `main` and when an issue opens, closes or changes milestone. A brief with no front matter still gets its milestone
and goal issue, from its file name and heading; the page then says it has no card yet.

## The Project

One user-level Project, "Orthograph", holds every goal, slice, snag, ask, decision and gap issue, with the fields Goal,
Kind, Status, Release, Harness, Model, Lead role, Start and End. It is where progress is seen (K33, 4B): open your
goal's view (named `Goal <n>`) to see your work, "By status" for every goal's board, or "Roadmap" for when each piece
opened and closed. You don't edit Goal, Kind, Status, Release or Harness there: the sync writes them from
the briefs and the issues, so change the brief or the issue (put your `harness:` label on a slice you take, link what
blocks it, close it when it lands). Model and Lead role you may set by hand on an item; the sync never clears them.

```bash
node tools/github/sync.mjs --goal-branches --project            # what it would change, issues and Project
node tools/github/sync.mjs --goal-branches --project --apply    # needs the token's project scope
```

## The board (K42)

The capability map in `docs/canon/status.md` (its section 2) is the truth of the items: one table row per item, with an
id, the item in plain words, its stage, who pulled it, its release, its app milestone, its lane, the paths it touches,
the ids it needs and its evidence. `--board` reads the rows and plans one issue per row, found by the marker
`<!-- orthograph:item=<id> -->` in its body (never by title), so a row is never made twice and nothing is deleted:

- **Labels:** `kind:capability` (or `kind:gap` for an id that starts `gap-`), `release:<r>` and, once a goal has claimed
  it, `lane:goal-<n>`.
- **Milestone:** the first app milestone that pulls it (the superagent's coding agent, triage agent, extraction and
  launch; Capxul's getting paid, books, people and payroll, and banking), or "Not yet needed".
- **State:** closed when the row is built or extracted, open at any other stage.
- **Project fields** (with `--project`): Stage, Pulled by, Release, Lane and Kind.

You change an item by changing its row in the pull request that changes the item. A row the sync can't read stops the
run (exit 2) before any step. Claim an item by setting its lane and naming its paths; the sync prints any two goals'
claims that overlap, for Goal 18 to settle.

```bash
node tools/github/sync.mjs --board --dry-run              # the plan for the rows, and the counts by stage and by who pulled them
node tools/github/sync.mjs --board --project --dry-run    # and the Project's fields
node tools/github/sync.mjs --board --apply                # do it
node --test tools/github/board.test.mjs                   # its tests
```

## Working a slice

1. At the start: merge your base in; read the open issues in your milestone with `kind:ask` (asks to you) and answer
   or schedule each.
2. Comment on the slice issue: `[goal-6 · builder · amp · claude-opus-5-5] Taking this.` Add your `harness:` label to
   it; the Project then shows it as Running.
3. Open the pull request from the template: `Lands #<slice>`, your milestone, your `role:`, `harness:` and `release:`
   labels. Fill every line; "none" is an answer. Rewrite the brief's "Where it stands" in the same pull request.
4. When it merges, close the slice yourself. GitHub closes an issue from `Closes #<n>` only when a pull request merges
   into main, and a slice's pull request merges into its goal branch:

   ```bash
   gh issue close <slice> --comment "[goal-6 · builder · amp · claude-opus-5-5] Landed in #<pr>."
   ```

```bash
gh pr create --base goal/portal --milestone "Goal 6: the new portal" \
  --label role:builder --label harness:amp --label release:beta --body-file pr.md
gh issue list --milestone "Goal 6: the new portal" --label kind:ask --state open
```

## Every comment names itself

Every agent works under one GitHub account, so every comment an agent posts (on an issue, a pull request, a review, a
reply) opens with one line saying who wrote it:

```text
[goal-6 · builder · amp · claude-opus-5-5]
```

Goal, role, harness, model. Outside a goal, write what you are in the goal's place (`[conductor · lead · claude ·
claude-opus-5-5]`). It is data on the work, like the labels, not an attribution line, and it is how a reader of any
thread tells which goal, harness and model is speaking.

## Snags, asks and the ledger

- **Your own snag** is a Snag issue in your milestone. The old `<nn>-snags.md` files stay as the record of what came
  before; new snags are issues, so they can be filtered, linked and closed by the pull request that fixes them.
- **An ask** goes in the milestone of the goal that must act, with the Ask form: what you need, what done looks like,
  what waits on it. You never edit its paths to get around it; its lead closes the ask with a pull request.
- **Link what stops a slice.** When a snag or an ask stops one of your slices, mark the slice blocked by it, so your
  goal page lists it under "Open snags" or "Waiting on other goals":

  ```bash
  id=$(gh api repos/Open-Harness/orthograph/issues/<snag-or-ask> --jq .id)
  gh api -X POST repos/Open-Harness/orthograph/issues/<slice>/dependencies/blocked_by -F issue_id="$id"
  ```
- **The ledger** (`design/ledger.md`) stays one file: hundreds of rows, cited by id. A row becomes a Gap issue only
  when someone picks it up or a release needs it; the issue's title starts with its id, and the row gets the issue's
  link in the pull request that closes it.

## Reviews and nits

A 🔍 reviewer (the `reviewer` skill) marks each review comment:

- `blocker:` must be fixed before the merge. Only the reviewer's next pass resolves it.
- `nit:` doesn't block. The author answers "taken" (and fixes it) or "left: <why>", then resolves the thread.
- `question:` needs an answer, not necessarily a change.

Every thread must be resolved before a merge (branch protection), so a nit is never left open, only answered.

## Decisions

A goal names its own calls by area and a slug (`WEB-piece-state`, `MAP-route-params`), checks no file in
`design/decisions/` on any branch starts with the name, and lists it in its brief. A call that crosses goals takes a
lettered id from the conductor's list in `design/handoff.md`. A Decision issue is optional: open one when the call
waits on someone, close it with the pull request that writes the file.
