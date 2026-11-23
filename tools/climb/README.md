# tools/climb: the climb recorder

Goal 3, loop step 2: every prove run is appended to `design/evidence/climb/runs.jsonl`, taken from prove's own report.

- `record.mjs` is the **entry file**: it holds the clock (`new Date()`), `spawn`, the filesystem and `process`, and is the only file that
  does. `node tools/climb/record.mjs <ortho prove args>` (or `nx run e2e:climb-record -- …`) runs `ortho prove --report <tmp>`, streams its
  output unchanged and appends `{ at, commit, journey, green, total, seconds, run_seconds, prove_seconds, exit }` per journey (`run_seconds` is timed here, spawn to close, world start and stop included; `prove_seconds` is prove's own timer, which starts once the world is up). A report it cannot read
  records nothing, says why on stderr and exits 3 (prove's own code, when that is not 0 or 1); its temp folder is removed either way.
- `parse.mjs` is pure: a `ProveReport` (schemaVersion 1) in, `{ ok, lines }` or `{ ok: false, problem }` out. It never throws.
- `parse.test.mjs` runs on a real report (`fixtures/prove-report.json`): `node --test "tools/climb/*.test.mjs"`, part of `nx run e2e:grid`.
