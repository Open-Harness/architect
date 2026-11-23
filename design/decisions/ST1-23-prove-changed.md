# ST1-23: `ortho prove --changed` takes its base from the last proof's record, and the check that holds it

20 November 2026. Decided by the checks author for ST1.23 and ST1.24 (Goal 3), under AGENTS.md, "Who decides". The slices are
A2 and A1 of [`../research/speed-and-vitest-proposal.md`](../research/speed-and-vitest-proposal.md); the checks are
`e2e/m1/29-st1-23-prove-changed.test.ts` and `e2e/m1/30-st1-24-warm-world.test.ts`.

## The question

`--changed` needs a base: what "changed" is measured from. Two candidates were named, a git ref (default: the merge base with the
default branch) and the last prove's recorded hashes.

## Evidence (read from the code, 20 November)

- Prove already writes a record after every full run, `.ortho/evidence/proven.json` (`packages/prove/src/modules/impact`): the model
  just proven, per operation the hashes its proof rests on, and per operation per journey a verdict with the handler's hash
  (`handlerHashes` in `verdicts/internal/proof.ts`) and the model's hash. `ortho impact` already compares today's model with it.
- The model already carries what the map needs: `operations.<op>.hash` (the declaration), `journeys.<file>.sourceHash`,
  `startingWorlds.<name>.sourceHash`, each journey's calls and each starting world's `makes`. Today's `ortho impact` sees a changed
  handler (`stale allowance.spend`), a changed declaration of an operation or a read (`stale allowance.revoke`, `stale allowance.get`)
  and a changed journey, and sees nothing of a changed `ortho.config.ts` or a new helper under `src/` (`stale none`).
- A journey stands on its starting worlds: five of acme's journeys start from `funded`, whose `makes` call `allowance.grant`. So a
  change to `grant.ts` touches 6 journeys, not the 1 that calls `grant` in a step. The check plants it.

## Decision

`ortho prove --changed` (a flag, no argument) measures from **the record of the last proof**. It reruns exactly the journeys whose own
file changed, or that call (through steps or starting worlds) an operation whose handler, declaration or last verdict changed, or
that stand on a starting world that changed. It names each journey it skipped. Where it cannot place a changed file, or has no
record, it proves everything and says why. The full surface, the lines and the report's `changed` section are in the header of
check 29, where the builder reads them.

## Why this and not a git ref

1. **It is the loop the slice is for.** The climbing agent edits one handler and proves. Against a merge base every iteration
   reruns everything touched since the branch began; against the last proof it reruns what changed since the last run, and a
   journey that failed stays in the next run until it passes (a failure is not recorded as proven).
2. **No git.** A copy in a temporary folder, a CI cache restore and a fresh checkout all work the same; a ref needs a repository,
   a fetched base and a rule for a shallow clone. The check plants its changes in copies of acme with no `.git`.
3. **The pieces exist.** The record, the hashes and `scenarioOf` (a journey and its starting worlds' operations) are there. What
   the builder adds is a content hash of the other files that can change a proof, in the record, by relative path (so a record
   made in one folder holds in a copy of it, which the check relies on), and the selection.
4. **A git base can come later, on the same record's shape.** CI wants "since the base branch" (A3, verdict reuse, keyed by hashes);
   that is a different key and it is in `design/later.md`. Nothing here forecloses it.

## The files the record hashes, and the ones that cannot be placed

The record keeps a content hash, by relative path, of every file that can change a proof: everything under `blueprint/`, `src/`,
`journeys/` and `generated/`, and `ortho.config.ts`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `.env`, `.env.*` and the
lockfile of the workspace the project sits in (recorded as `<workspace>/<name>`). Left out are what cannot reach a running world: tests
(`*.test.*`, `*.spec.*`) and notes (`.md`) outside `src/` and `blueprint/`. The files are read once, when the run begins, and that
reading is what the run is recorded against, so an edit made during a run is a change to the next one.

What an operation rests on is not a list of the edges someone thought of. It is the **import closure** of its declaration and its
handler, inside the project (`import`, `export ... from`, `import()` and `require()` followed through relative paths; a file outside
the usual folders that is imported is read in), and what `Compare.dependsOn` tracks (its thing, its mounts). A journey rests on its
file, the starting worlds it stands on and their closures, and the operations they call. The model **places** a file only when it
lies in some such closure. Any other changed, added or removed file cannot be placed, and neither can a file whose imports could not
all be followed (an alias, a `#` import, a path outside the project, a file that is not there): `--changed` then proves every journey
and names the file. A file that imports or requires by a specifier that is not a literal is opaque too, and whatever rests on it
rests on every file, since its target could be any; so does a file that reads files at run time (`readFileSync`, `new URL(...)` with
`import.meta.url`, a glob), since what it reads is no import. A package the project runs from source (declared `workspace:`,
`link:` or `file:` in its `package.json` or its workspace's, or reached through a symlink that leaves the package store, and what
those depend on in turn) has its files hashed as `<package:name>/...`, tests, notes and `node_modules` aside; no closure reaches
them, so a change there proves everything and names the package. So unknown means prove everything, and `generated/` (the server, the model) is never placed. A journey is keyed
by its file, since two may share a name. A record that cannot be read (not JSON, not a ledger, a malformed section) is no record.
The check plants the config, `package.json`, the lockfile, `tsconfig.json`, an env file, `generated/`, a new helper, a helper
edited and deleted, and a handler imported by another.

## What a rerun owes besides the journeys

A rerun judges the evals of what changed again (a summary line `<operation> 9 evals ✔` or `<operation> n of 9 evals ✘` for each),
since an eval can fail where no journey does: the check drops the log that says why `grant` refused, and expects the six journeys to
pass, `allowance.grant explainability ✘`, and exit 1. It also owes proof that it ran what it reports: the collector hears each
operation at least as often as the rerun journeys' steps that reach a handler (a read, and a step refused before its span, are
left out, `refusedBeforeSpan`), and every step's verdict agrees with its journey's.

## Mounted dependencies, and journeys of one name

Two false greens Codex found in the first build, planted before its fix: a change to a file of a mounted plugin (the echo
plugin's `choices.js`, which its handlers import; `ortho impact` already marks the mount's operations stale) skipped every journey
that calls it, and two journey files declaring one name were keyed by that name, so changing one reran both. The check plants each
(`29`, "two more false greens"): the mounted file must rerun exactly the one journey that calls the plugin's operations, and a
change to only the twin, or only the original, reruns that file's journey and names the other skipped. Both rows fail against
`88655dd5` (ran none of the 12; ran both twins) and pass against `50dd40b8`.

Two more the 🔍 found at `50dd40b8`, planted the same way: a throw appended to `generated/server/main.ts` (a full prove can no
longer run the world) came back "proving 0 of 11, prove ✔", and a handler that imports a value from another operation's handler
(`health.ts` from `grant.ts`) was skipped when only the imported file changed, so "health is up" was never judged against the new
value. The check wants the generated file named as one it cannot place (everything proven, never a green), and the importer's
journey rerun or everything proven.

## What the check pins, and what it leaves

Pinned: the exact set rerun and the exact set named skipped, from the model; a fall-back that names the file it could not place
or says there is no record; the union of two changes; that a failing change is rerun until it passes; that a second run with
nothing changed runs none. Left to the builder: how the record keeps its file hashes, the wording after the pinned prefixes, and
how evals are judged for a subset beyond the lines above (what it skipped keeps its recorded verdicts).

A journey change reruns that journey alone, though the operations it calls are called by others (the model's `sourceHash` says
which file changed, and nothing else rests on a journey's text). Today's `ortho impact` is coarser here and marks three operations
stale; the check does not accept that coarseness, since "reruns every journey it affects" is not "reruns what shares an operation".

## The warm world's check (ST1.24)

Wall-clock on the shared Mac is noisy, so the check does not make time the proof. Its hard rows are structural: against `ortho dev`,
prove starts no wrangler or workerd process (a 120 ms poll of `ps` over the whole run, less what was already running), says
`prove: reusing the world of ortho dev at <dev's url>`, and gives the cold run's verdict, journey by journey and step by step.
Isolation is a fixture journey that signs up one fixed email, run three times against one warm world: a world that keeps the last
run's person refuses the second. The 6 s is a separate soft row: after a warm-up, the faster of two timed runs, wall-clock,
reported with the cold time; it runs only if the warm-up reused dev's world. (Superseded by ST1-24-timing, 20 November 2026: the row is
the fastest of three timed runs at most 70% of the cold run on the same machine, and the 6 s is information only.) No flag was added to `prove`: it finds a live world
by what `ortho dev` leaves in `.ortho/`, and a stale record (dev stopped) is ignored.

Reset or isolate is the builder's call; the check asks that a run never sees the last one's records, and that a handler edited
between two warm runs is what the next run judges (a guard that passes today and must keep passing).

## Supersedes

- design/milestones.md (ST1.23): "changed since a base" → "changed since the last proof's record"
