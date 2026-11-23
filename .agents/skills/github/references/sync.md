# The board's sync, in detail (K42, section 5)

`tools/github/sync.mjs --board` reads the capability map in `docs/canon/status.md` (section 2) and plans one issue per
row. A row the sync cannot read stops the whole run (exit 2) before any write, so a typo cannot drop an item from the board.

## What a row becomes

- **The issue.** Titled with the row's name (the Item cell's text before the first `: `: every Item starts with a short
  name of at most 50 characters and a colon). Its body is the row, rewritten whole each run, under a hidden marker
  `<!-- orthograph:item=<id> -->` that is how the next run finds it (never by title).
- **Labels:** `kind:capability` (or `kind:gap` for an id that starts `gap-`), `release:<r>` and, once a goal has claimed
  it, `lane:goal-<n>`. Other labels (`harness:`, `goal-<n>`, `blocked`) are left alone.
- **Milestone:** the first app milestone that pulls it, or "Not yet needed". Each app milestone's **due date** is the
  forecast end of its last item.
- **State:** closed when the row is built or extracted, open at any other stage.
- **Project fields** (with `--project`): Stage, Pulled by, Release, Lane, Kind, Status, Start and End.

## Adopting an issue

Many issues already describe items, and a first run must not duplicate them. In a row's Evidence cell, in backticks:

| Write | What the sync does |
|---|---|
| `` `issue #531` `` | **adopts** #531, which must be a `kind:ask` issue: writes the marker, the labels (its `kind:ask` is replaced by the row's kind), milestone, issue type and Project fields onto it, and keeps its old text beneath a `<!-- orthograph:original -->` line, so nothing is lost |
| `` `folds #533, #538` `` | closes each as a duplicate, with a comment pointing at the row's issue; needs an `issue #N` in the same cell |

A row adopts at most one issue; an issue belongs to at most one row; the sync stops before any write if an adopted or
folded number is no issue, is a pull request, was opened by an outsider, is another row's, or is labelled `kind:snag`,
`kind:decision`, `kind:goal` or `kind:slice`. **Only `kind:ask` issues are adopted or folded.** A snag (a claim is one, and
another goal may wait on it), a decision, a goal or a slice is never touched: name it as a plain `#N` in Evidence. An ask
that only partly matches a row is named plainly too, and Goal 18 closes it by hand with a pointer. Leave a case-2 ask
alone until Goal 18 settles it.

## Status

Done when built or extracted; **Running** (the Project's word for in progress) when the row has a lane; **Ready** only when
every row in Needs is built; otherwise **Blocked**.

## The roadmap's dates (computed, never typed)

- **Start:** the day the row first got a lane (read from the page's history) or its first evidence pull request merged,
  whichever is earlier. **End:** for a built row, the day its last evidence pull request merged.
- **Forecast** (`tools/github/roadmap.mjs`, pure and tested): for a row not yet done, from what needs what and the pace
  measured so far (pull requests merged per day over the last seven full days), spent a day at a time on the rows that are
  ready, the superagent's milestones first. The superagent's milestones run in the order of its brief. A row no app has
  pulled has no dates.
- A **milestone's due date** is the forecast end of its last item, so a slip shows where it comes from. It is a forecast,
  never a promise: a milestone that has a due date says "Forecast, recomputed every run (K42 §5)" in its description, and
  the date moves as the pace and the rows do.

## The issue types are made once, locally

An organization's issue types (here Capability and Gap) need the `admin:org` scope, which the `goals` workflow's token
never has. So a human or Goal 18 runs this **once**, locally, with a token that has it:

```bash
node tools/github/sync.mjs --board --bootstrap --apply    # makes the issue types and nothing else
```

Until the types exist, the workflow's **board step** prints `::warning::` ("run --board --bootstrap locally") and exits 0,
writing nothing: it never goes red, and never tries. That holds only for the board step, and only for a token whose scopes
cannot be read (the workflow's own `github.token`). The **goal-pages step** (`--goal-branches --apply`) is different: with
`ORTHOGRAPH_PROJECT_TOKEN` set, its scopes can be read, and while the types are missing and the token lacks `admin:org` it
exits 3 (`gate.test.mjs`). Today no such secret exists (`gh secret list` shows none), so both steps run on `github.token`
and warn. Once the types exist, every create and update happens inside the workflow's
`concurrency` group, one run at a time, so a local run cannot race it. Do the bootstrap before the first push to `main`
that carries the board, and run the board itself only through the workflow.

## Run it

```bash
node tools/github/sync.mjs --board --dry-run              # the plan, the counts by stage, any two claims that overlap
node tools/github/sync.mjs --board --project --dry-run    # and the Project's field writes
node tools/github/sync.mjs --board --project --apply      # do it (the goals workflow does, on every push to main)
node --test tools/github/                                 # its tests
```

A dry run prints how many issues it would adopt, create, update, close and fold, the pace and each milestone's date, and
the Project's field writes. `--apply --project` needs the token's `project` scope; without it the run exits 3 **before any write at
all** (the issues too). The workflow therefore passes `--project` only when `ORTHOGRAPH_PROJECT_TOKEN` is set.

**What runs when.** The goal pages run on issue events (opened, closed, reopened, milestoned, labeled), on a push to
`main`, every three hours and on dispatch. The board runs only on a push to `main`, on the three-hourly schedule and on
`workflow_dispatch`, never on an issue event.
