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
| `` `issue #531` `` | **adopts** #531: writes the marker, the labels (its `kind:ask` or `kind:snag` is replaced by the row's kind), milestone, issue type and Project fields onto it, and keeps its old text beneath a `<!-- orthograph:original -->` line, so nothing is lost |
| `` `folds #533, #538` `` | closes each as a duplicate, with a comment pointing at the row's issue; needs an `issue #N` in the same cell |

A row adopts at most one issue; an issue belongs to at most one row; the sync stops before any write if an adopted or
folded number is no issue, is a pull request, was opened by an outsider, or is another row's. **Never adopt a bug, a snag
or a decision** (they are not items), and leave a case-2 ask alone until Goal 18 settles it.

## Status

Done when built or extracted; **Running** (the Project's word for in progress) when the row has a lane; **Ready** only when
every row in Needs is built; otherwise **Blocked**.

## The roadmap's dates (computed, never typed)

- **Start:** the day the row first got a lane (read from the page's history) or its first evidence pull request merged,
  whichever is earlier. **End:** for a built row, the day its last evidence pull request merged.
- **Forecast** (`tools/github/roadmap.mjs`, pure and tested): for a row not yet done, from what needs what and the pace
  measured so far (pull requests merged per day over the last three full days), spent a day at a time on the rows that are
  ready, the superagent's milestones first. The superagent's milestones run in the order of its brief. A row no app has
  pulled has no dates.
- A **milestone's due date** is the forecast end of its last item, so a slip shows where it comes from.

## Run it

```bash
node tools/github/sync.mjs --board --dry-run              # the plan, the counts by stage, any two claims that overlap
node tools/github/sync.mjs --board --project --dry-run    # and the Project's field writes
node tools/github/sync.mjs --board --project --apply      # do it (the goals workflow does, on every push to main)
node --test tools/github/                                 # its tests
```

A dry run prints how many issues it would adopt, create, update, close and fold, the pace and each milestone's date, and
the Project's field writes. `--apply` needs the token's `project` scope for the Project; without it, nothing of the
Project is written and the run exits 3.
