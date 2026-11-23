# impact

What a blueprint change unproves. After every prove, `Impact.record` writes `.ortho/evidence/proven.json`: the
model just proven, and for each operation whose evals all passed, the hashes its proof rests on (from
`Compare.dependsOn`: itself, its thing, the things it refers to). `Impact.of` compares today's model with that
ledger: an operation is **stale** when one of those hashes changed, **proven** when none did, **unproven** when it was
never proven. `ortho impact` prints it, with each changed declaration first.

With the logbook's word (`Impact.lines(impact, shipped)`) the release's changes, `next <version>` and `stale <ops> in <envs>`
are printed instead of the local `stale` (see `releases`); what the local ledger finds stale is then `locally stale`.

## `prove --changed`

The ledger also carries `changed`, the record `ortho prove --changed` measures from (`Impact.stamp`, `Impact.select`,
`Impact.settle`). `stamp` reads the project once, before a run: a content hash by relative path of `blueprint/`, `src/`,
`journeys/`, `generated/`, `ortho.config.ts`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `.env*` and the lockfile of the
workspace the project sits in (tests, and notes outside `src/` and `blueprint/`, are left out). `settle` records that stamp, never a
later reading, so an edit made during a run is a change to the next one.

What a journey or an operation rests on is its **import closure** inside the project: an operation's declaration and handler, a
journey's file and the starting worlds it stands on, and every file they reach by `import`, `export ... from`, `import()` or
`require()` (relative paths; a file outside the usual folders that is imported is read in too), plus what `Compare.dependsOn`
tracks (things, mounts). A file is **placed** only if it lies in some closure. An import that cannot be followed (an alias, `#`
imports, a path outside the project, a file that is not there) makes its importer opaque, and an opaque file is not placed. A
changed, added or removed file that is not placed, or no readable record, runs everything and says why.

A run reruns the journeys whose inputs moved, that failed, or that call an operation whose evals have to be judged again (its
inputs moved, or it did not pass). A full prove writes the same record, so a record made in one folder holds in a copy of it. See
`design/decisions/ST1-23-prove-changed.md`.
