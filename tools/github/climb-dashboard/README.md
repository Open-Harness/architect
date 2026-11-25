# The climb dashboard: how to make it in any claude.ai account

K45, Goal 18's slice 13. The dashboard shows the two builds, the alpha and Capxul, climbing on three dimensions:

- **capabilities:** the board's rows by stage;
- **tests:** passing, failing, and journeys written;
- **slices:** done and open.

It is a claude.ai **Data** artifact (the Dashboard type), fed by two JSON files that `tools/github/climb.mjs` writes. Nothing here is tied to one account: any Claude session that has this repository and the Artifact tool can make it from scratch, or refresh one it made.

This folder holds:

| File | What it is |
|---|---|
| `index.html` | The dashboard's page, stored as the artifact's `files/index.html` document |
| `README.md` | This file |
| `../climb.mjs` | Writes `history.json` and `items.json` from git and GitHub |

## The prompt to paste

In a Claude Code session with this repository checked out (a cloud session on `Open-Harness/orthograph` will do), paste:

> Make the Orthograph climb dashboard. Follow `tools/github/climb-dashboard/README.md` exactly: work out the data with `tools/github/climb.mjs`, create a Data (Dashboard) artifact titled "Orthograph Climb", upload the two files, write the four store documents, and fix the page until its check passes. Then give me the link.

What follows is what that session does.

## 1. Work out the data

From the repository root:

```bash
git fetch origin main goal/stage-1 goal/capxul
mkdir -p /tmp/climb
for g in 16 18; do
  gh api -X GET search/issues -f q="repo:Open-Harness/orthograph is:issue label:kind:slice label:goal-$g" -f per_page=100 \
    --jq '[.items[] | {number, title, state, closed_at, created_at}]'
done | jq -s 'add' > /tmp/climb/slices.json
node tools/github/climb.mjs --slices /tmp/climb/slices.json --out /tmp/climb
```

The last command prints the number of points and items, and writes `/tmp/climb/history.json` and `/tmp/climb/items.json`. Each is `{ rows, meta }`, and `meta` carries the script's own code. The page reads these columns:

- **history:** `at`, `day`, `lane` (`alpha` or `Capxul`), `dimension` (`capabilities`, `tests` or `slices`), `series`, `value`. The series are:
  - each stage, `provisional` to `extracted`, and `progress`;
  - `passing` and `failing` for the alpha, `written` for Capxul;
  - `done` and `open`.
- **items:** `lane`, `dimension`, `id`, `name`, `group`, `status`, and `passing` and `tests` for a suite.

## 2. Create the artifact

1. Call the Artifact tool with `action: "quickstart"` and `intent: "other"`. It names the Data type and its `type_url`.
2. Publish with that `type_url`, `title: "Orthograph Climb"` and `auto_open: "after_first_write"`, and no files. The result gives the new artifact's `url`.
3. Read `artifact-type/reference/one-writer.md` and `artifact-type/reference/design-defaults.md` from it (Artifact `read` with `paths`). The type asks for both before a page is written.

## 3. Upload the two files

Two calls: Artifact `publish` with the new `url`, `asset: true`, and `file_path` set to `/tmp/climb/history.json`, then to `/tmp/climb/items.json`. Each result gives a `/_blob/<id>` URL; keep both.

## 4. Write the store

One ArtifactData `batch` on the new `url`, with four `set` writes:

| collection | doc_id | data |
|---|---|---|
| `dash` | `meta` | `{"title": "Orthograph climb"}` |
| `datasets` | `history` | see below |
| `datasets` | `items` | see below |
| `files` | `index.html` | `{"text": <this folder's index.html, verbatim>}` |

The two datasets, with the two blob URLs from step 3 and the current time:

```json
{"title": "Climb history",
 "description": "Each build's capabilities by stage, tests and slices, at every commit that moved them, worked out by climb.mjs from git and GitHub.",
 "source": {"kind": "file", "url": "/_blob/<history id>", "name": "history.json", "format": "json"},
 "updated": {"at": "<ISO time>", "by": "climb.mjs"},
 "schedule": "Worked out again nightly", "staleAfterHours": 48}
```

```json
{"title": "Capabilities, suites and slices",
 "description": "Every board row in the two builds, the alpha's test suites, and Goals 16 and 18's slices, as they stand.",
 "source": {"kind": "file", "url": "/_blob/<items id>", "name": "items.json", "format": "json"},
 "updated": {"at": "<ISO time>", "by": "climb.mjs"},
 "schedule": "Worked out again nightly", "staleAfterHours": 48}
```

The ids `history` and `items` matter: the page reads `dash.data('history')` and `dash.data('items')`, and declares its calcs (`latest`, `latestTotals`, `byMilestone`) from them.

## 5. Check the page

Open the artifact, then read `data/users/me/check` (ArtifactData `get`, collection `data/users/me`, doc_id `check`).

- `passed` means it ran.
- `failed` names what threw or looks wrong, and `where`, the `data-draw` it happened in. Fix `files/index.html` with `str_replace`, pinned to the version you last read, and read `check` again.
- Each `<script>` runs in its own scope. A constant two scripts use is declared in both, or put on `window`.

## 6. Refresh it

To refresh it, repeat step 1. Then upload the two files again (step 3), and `update` the two datasets with the new blob URLs and a new `updated.at`. The page itself needn't change.

A nightly scheduled task can do this: a fresh cloud session on this repository with the prompt "Refresh the Orthograph Climb dashboard at <url>: follow step 6 of tools/github/climb-dashboard/README.md."

## What the numbers mean

- **Capabilities:** each row in a build, by stage, from `docs/canon/status.md` in git, from 23 November, when the board was first whole. Progress weights the stages: provisional 0, spiked 0.2, scaffoldable 0.4, building 0.6, built and extracted 1 (`roadmap.mjs`'s `STAGE_SHARE`). A row climbs in the alpha when its milestone is `alpha`, and in Capxul when its milestone is on Capxul's path (`board.mjs`).
- **Tests:** the alpha's suites (`ALPHA_SUITES` in `climb.mjs`): each `test(` or `it(` call, less the keys on the suite's `expected-failing/` lists. The history is on `goal/stage-1` until Gate M1's suites reached `main` on 23 November, then on `main`. Capxul's journeys are counted as written on `goal/capxul`; they pass and fail once Goal 16's slice 13 runs them in CI.
- **Slices:** Goal 18's from slice 4 (the alpha), and Goal 16's (Capxul), opened and closed on GitHub.
