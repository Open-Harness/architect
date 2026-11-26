---
name: github
description: How Orthograph's work lives on GitHub (K33, K42), for every agent in any harness. The board (one issue per row of docs/canon/status.md), claims (lane labels), the apps' milestones, Decision issues labelled needs-aaron for grills, snag and ask issues, release, role and harness labels, the pull request template, review nits, and tools/github/sync.mjs, which writes the issues and the Project from the status page and the goal briefs. Read it before you open an issue or a pull request, start or finish a slice, claim an item, log a snag, or change a row.
---

# Orthograph on GitHub

The files are the truth and GitHub is where the work is seen ([K33](../../../design/decisions/K33-github-native.md), on top
of [K32](../../../design/decisions/K32-goals-coordinate-themselves.md), changed by
[K42](../../../design/decisions/K42-goals-are-agents.md)). Every agent here, whatever its harness, works under one GitHub
account, so who did what is said by labels and the template, never by an assignee.

Two truths feed GitHub, and the sync reads both:

- **The board:** `docs/canon/status.md`, section 2: one row per item (K42, section 5). A goal changes its row **in the
  same pull request** as the item, so nobody remembers to close an issue.
- **The goals:** `design/goals/<nn>-<name>.md`: each goal's front matter, slices and "Where it stands".

## The map

| Thing | On GitHub | Made by |
|---|---|---|
| An item | one issue, type Capability or Gap, `kind:capability` or `kind:gap`, with `release:<r>` and `lane:goal-<n>`, in an **app milestone**, found by a hidden marker `orthograph:item=<id>` | `sync.mjs --board`, from the row |
| A claim | the label **`lane:goal-<n>`** on the item's issue plus the row's **Touches** (the paths) | you, by setting the row's lane |
| A goal | the label `goal-<n>`, a milestone `Goal <n>: <title>` for its own issues, and a **goal issue** (`kind:goal`) | `sync.mjs`, from the brief's front matter |
| A slice | a **sub-issue** of the goal issue (`kind:slice`), **blocked by** the slices it comes after | the sync, from the brief's `slices:` |
| A snag (your goal's own) | an issue, type Snag, `kind:snag`, in your goal's milestone | you, with the Snag form |
| A case-2 ask | an issue, type Ask, `kind:ask`: two goals' claims overlap, so Goal 18 settles who builds it (K42, section 3) | you, with the Ask form |
| A grill | an issue, type Decision, `kind:decision`, labelled **`needs-aaron`** | you, with the Decision form |
| A release (K28, K42 section 6) | a label: `release:preview`, `release:beta` (what Capxul's books, HR and payroll prove, K44), `release:1.0` (what the rest of Capxul core proves) | the sync |
| Who did it | labels `role:<role>` and `harness:<harness>`, and the template's lines | you, on every pull request |
| What waits on what | a **blocked-by** link from the slice to the snag or ask that stops it | you (below) |
| Blocked | the label `blocked`; `needs-aaron` when only Aaron can unblock it | you |
| Parked | the label `parked` on a parked goal's own open goal issue and slices, unless a running goal shares or claims one; the Project's views leave them out, nothing is closed, and it comes off when the goal resumes or the issue closes. Its snags, asks and decisions stay in view for Goal 18 to sort (K45). One item is parked by hand through the Project's Status, `Parked` | the sync |
| Where a goal is | the **goal issue's body**: card, progress, snags, waits, lead, "Where it stands" | the sync, rerun by the `goals` workflow |
| Every item and goal at once | the **"Orthograph" Project**: Stage, Pulled by, Release, Lane, Status, Start and End on each item; views "All goals", "By status" and "Roadmap" without the parked issues, "The alpha", "Capxul's path", "Parked", and one per running goal (K45; filter by field for the rest). The sync never deletes a view, so a parked goal's old view stays until someone deletes it in the Project | the sync, `--project` |
| How each build climbs | the **climb dashboard**, a claude.ai Data artifact: the alpha and Capxul, each on capabilities by stage, check files green and red, journeys written and slices, over time (K45). `tools/github/climb.mjs` writes its two files; `tools/github/climb-dashboard/README.md` says how to make or refresh it in any account | Goal 18; nightly once a scheduled task runs the README's refresh |

**Milestones are the two builds'** (K45): the alpha's (`Alpha: Orthograph on npm`), then Capxul's path, the books,
people and payroll, banking, budgets, and getting paid (later, with the chain); the parked superagent's stay for when it
resumes. A framework piece takes the alpha's milestone when the alpha needs it, or the first Capxul milestone that pulls it; a piece no app has pulled sits in "Not yet needed", with no dates. GitHub allows one
milestone per issue, so an item's issue sits in its app milestone and the release is a label. A goal's own issues (its goal
issue, slices, snags) stay in its `Goal <n>:` milestone, which closes when the goal stops. A model is never a label (models
change weekly): it goes in the pull request's "Harness and model" line and the brief's `lead:`.

Each kind is its own issue type once the repository is in an organization (K33, 2A); until then the nearest native type
stands in (Feature for a goal, Bug for a snag, Task for the rest). Filter by the `kind:` label either way.

## Change a row, claim an item

1. **Claim before you build** (K42, section 3). Open `docs/canon/status.md`, find the row (or add one, with a new id: ids
   are stable, never reused), set its **Lane** to `goal-<n>` and its **Touches** to the paths you will change, and set its
   stage as it moves. Read the collision rule first (the `conductor` skill's `references/board.md`): case 1 wait, case 2 ask
   Goal 18, case 3 claim it and build it.
2. **Move the row in the pull request that moves the item:** stage, evidence (the pull request, the journey that proves
   it). **Built** is green on `main` and proved by the journeys of the app that pulled it.
3. **Release the claim** by setting the lane back to `none` when you stop. A goal that stops releases every claim.

The details of the columns, **adopting** an existing `kind:ask` issue into a row (`` `issue #N` ``), folding duplicate asks
into it (`` `folds #N, #M` ``), the Project's Status and the roadmap's dates (a forecast) are in
[references/sync.md](references/sync.md). A snag, a claim, a decision, a goal or a slice is never adopted: write it as a
plain `#N` in Evidence.

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

Right after its start line comes the **plain goal card**, the first thing a person or a cold agent reads, copied word for
word to the top of the goal issue: **In one sentence, Why, When it's done you can, It is, It isn't, Done when, Waits on,
Words used.** Write it for someone who has read nothing else: no ids, no file paths, no term it doesn't explain, about
twenty lines at most. The details stay below it, for the lead. A 🔍 reviewer reads the card alone and says whether it
makes sense.

The lead sets `lead:` and `status:` when it starts and whenever they change, in the pull request that changes them. Only
the parser's subset is allowed: `key: value`, `key: [a, b]`, a block list of `- item`, and one level of nested map. The
sync refuses anything else. A goal that stops sets `status: parked` or `done`, rewrites "Where it stands", and releases
its claims. A goal parked on `main` shows parked whatever its branch says; a goal that resumes sets `status:` on `main`
too.

## The sync (one run at a time)

```bash
node tools/github/sync.mjs --goal-branches --board --project --dry-run   # what it would do, read-only
node tools/github/sync.mjs --goal-branches --board --project --apply     # do it (the workflow does)
node tools/github/sync.mjs --board --bootstrap --apply                    # once, locally, with admin:org: the issue types only
node --test tools/github/                                                 # its tests
```

It finds each issue by a marker in its body, never by title, takes only issues the owner, a collaborator or the workflow
opened, and **never deletes an issue, label or milestone**: a row removed from the page leaves its issue where it is. It removes
only a blocked-by link between two of a goal's own slices that the brief no longer gives (K44). You rarely run it: the
`goals` workflow runs it, one run at a time. The goal pages run on issue events, on a push to `main`, every three hours
and on dispatch; the board runs only on a push to `main`, on the three-hourly schedule and on `workflow_dispatch`. The
organization's issue types need `admin:org`, which the workflow's token lacks, so they are made once by
`--board --bootstrap --apply` run locally. Until then the **board step** warns (`::warning::`) and writes nothing, and never
goes red; the goal-pages step does too on `github.token`, but with `ORTHOGRAPH_PROJECT_TOKEN` set it exits 3 while the types
are missing. Writes are paced and a rate-limit refusal is waited out; a run that stops is mended by the next, since every row is
found again by its marker. The Project needs a token with the `project` scope (`ORTHOGRAPH_PROJECT_TOKEN`), and **no such secret exists today**
(`gh secret list` shows none). So the workflow runs on `github.token`, keeps the board's issues and milestones, and leaves
the Project's fields to a local run by Goal 18 each round, until Aaron grants a Project token.

## Working a slice

1. At the start: merge your base in (never rebase); read the open case-2 asks and claims that touch your paths and answer
   or settle each.
2. Comment on the slice issue: `[goal-6 · builder · amp · claude-opus-5-5] Taking this.` Add your `harness:` label to it;
   the Project then shows it as Running.
3. Open the pull request from the template, **as a draft**: `Lands #<slice>`, your milestone, your `role:`, `harness:`
   and `release:` labels. Fill every line; "none" is an answer. Change the row and rewrite the brief's "Where it stands" in
   the same pull request.
4. When it merges, close the slice yourself. GitHub closes an issue from `Closes #<n>` only when a pull request merges into
   `main`, and a slice's pull request merges into its goal branch until the lander lands it:

   ```bash
   gh issue close <slice> --comment "[goal-6 · builder · amp · claude-opus-5-5] Landed in #<pr>."
   ```

Always pass the repository to `gh` (`--repo Open-Harness/orthograph`), since it has moved before.

## Every comment names itself

Every agent works under one GitHub account, so every comment an agent posts (on an issue, a pull request, a review, a
reply) opens with one line saying who wrote it:

```text
[goal-6 · builder · amp · claude-opus-5-5]
```

Goal, role, harness, model. Outside a goal, write what you are in the goal's place (`[goal-18 · lead · claude ·
claude-opus-5-5]`). It is data on the work, like the labels, not an attribution line, and it is how a reader of any thread
tells which goal, harness and model is speaking.

**A Claude Code cloud session** leaves the model out, everywhere: in its comment lines (`[goal-16 · lead · claude]`), in a
pull request's "Harness and model" line (`claude`) and in any doc. Its environment forbids a model id in anything it
pushes. Its GitHub connection also adds a `_Generated by Claude Code_` footer to every pull request body and comment it
writes, and it can't remove it. A reviewer blocks on neither; other harnesses keep the model in, as above.

## Snags, asks, grills and the ledger

- **Your own snag** is a Snag issue in your milestone. A snag is a bug or a hole, never an item: if it needs real work,
  claim a row for it. The old `<nn>-snags.md` files stay as the record of what came before.
- **An ask** exists only for case 2: two goals' claims overlap. State both claims (lane, paths), what you need and what done
  looks like; Goal 18 settles it, and the row that results adopts the issue. For anything else, claim it (above) instead of
  asking.
- **A grill** is a Decision issue with the label `needs-aaron`: a question only Aaron can settle. Write it the way his
  rules say (the code first, then the options, graded), and let Goal 18 batch it. Its answer becomes a decision record, and
  you close the issue with the pull request that writes it.
- **Link what stops a slice.** When a snag or an ask stops one of your slices, mark the slice blocked by it, so your goal
  page lists it under "Open snags" or "Waiting on other goals":

  ```bash
  id=$(gh api repos/Open-Harness/orthograph/issues/<snag-or-ask> --jq .id)
  gh api -X POST repos/Open-Harness/orthograph/issues/<slice>/dependencies/blocked_by -F issue_id="$id"
  ```
- **The ledger** (`design/ledger.md`) stays one file: hundreds of rows, cited by id. A ledger row becomes a board row only
  when someone picks it up or a release needs it, and the row cites the ledger id.

## Reviews and nits

A 🔍 reviewer (the `reviewer` skill) marks each review comment:

- `blocker:` must be fixed before the merge. Only the reviewer's next pass resolves it.
- `nit:` doesn't block. The author answers "taken" (and fixes it) or "left: <why>", then resolves the thread.
- `question:` needs an answer, not necessarily a change.

Every thread must be resolved before a merge (branch protection), so a nit is never left open, only answered.

## Decisions

A goal names its own calls by area and a slug (`WEB-piece-state`, `MAP-route-params`), checks no file in
`design/decisions/` on any branch starts with the name, and lists it in its brief. A call that crosses goals takes a
lettered id from Goal 18's list in `design/handoff.md`. A decision that changes what an older doc says follows
`AGENTS.md`'s "One way to supersede": live docs are rewritten, dated records gain "Superseded by <id>, <date>", and the
decision lists each replaced phrase under `## Supersedes` (`tools/ci/supersedes.sh` checks it).
