# G12: a slice that changes acme's wire lands as a pair, a check branch and a build branch

Decided 21 November 2026 by the Goal 3 lead, after the 🔍 review of the M2.01 decision (#263) failed its second head. Written by
the building agent. Everything below was read in the tree at `goal/stage-1` `b3fd9eec`.

## The problem

A slice's plan was never traced against what the repository enforces. Three pieces of machinery decide who may write what and
what may be red, and M2's plan broke each of them.

**1. Which paths a `-build` branch may not touch, deletions included** (`tools/ci/builder-paths.sh:26-36`):

```bash
protected=(
  ':(glob)e2e/**'
  ':(glob)packages/*/expected-failing/**'
  ':(glob)examples/*/journeys/**'
  ':(glob)**/blueprint/journeys/**'
  ':(glob)packages/prove/src/modules/evals/**'
  ':(glob)packages/prove/src/modules/journeys/internal/checks.ts'
  ':(glob)examples/*/test/fixtures/evals/**'
  ':(glob)examples/*/test/fixtures/journeys/**'
  ':(glob)examples/*/test/fixtures/check/**'
)
```

The script runs with `--no-renames`, so a file moved out of a protected folder is a deletion and a hit. Not protected:
`examples/*/blueprint/starting-worlds/**` (their own header calls them journey-author files, policy and not a rule),
`examples/*/test/fixtures/layer2/**`, the generated folders, `packages/*/src/**` and its tests, and every `__snapshots__` file.

**2. Where a red check may wait.** G9 gave `e2e/m1` a ratchet list per check, G11 gave every package one, G7 gave the grid one.
`e2e/layer1` and `e2e/layer2` have none (`ls e2e/layer1 e2e/layer2` shows no `expected-failing`), and `ci.yml` runs them on every
pull request. A check there is green or the pull request is red.

**3. The files the checks hash from acme's own output.** Not by name, by bytes:

| File | Read by | What it hashes |
|---|---|---|
| `e2e/fixtures/m1/projections/acme-baseline.json` | check 12 (`12-projections.test.ts:67-70`) | acme's `generated/server` and `generated/api`, 33 files, and the whole `model.json` bar its `mounts` key (`projections.ts:38-40`) |
| `e2e/fixtures/m1/clients/acme-baseline.json` | check 14 (`14-clients.test.ts:88-101`) | acme's `generated/sdk`, `cli` and `mcp`, 52 files |
| `e2e/fixtures/m1/portal/acme-docs-baseline.json` | check 21's control A | every file of acme's `generated/docs` |
| `packages/compiler/src/modules/model/__snapshots__/acme.model.json` | the compiler's own test | acme's whole model |
| `examples/acme/test/fixtures/evals/who-may-call/main.ts` | check 3 and `prove.test.ts:103-110` | a frozen copy of acme's `generated/server/main.ts` with one planted line |

The last row is a contradiction in today's tree. Its README says "the builder should regenerate this fixture", and
`prove.test.ts:104` says "the author regenerates it", but the path is `examples/*/test/fixtures/evals/**`, which a builder may not
touch. So any slice that moves a byte of acme's generated server needs the author to recapture it.

**Put together, nothing can be green before and after.** `organization.create` requires `cap` today
(`examples/acme/blueprint/things/organization/verbs/create.ts:7`: `payload: { name: ..., cap: Organization.fields.cap }`). A check
that sends it passes on today's build and fails on the build that removes it; a check that omits it does the opposite. There is
no single wording of `e2e/layer2/support.ts:128` that is green on both sides of M2.07, and layer 1 and 2 have no list to park the
red one on. The same holds for every baseline above, because a baseline is a hash of the output the build is about to change.

## The call

1. **A slice that moves acme's wire, its model or a byte of its checked-in `generated/`, or that deletes or moves a file a
   protected journey, eval or fixture imports, lands as a pair.** The rest land as before.
2. **The checks author opens `goal-3/<slice>-check` into `goal/stage-1`.** Its first commits re-author the checks, journeys and
   fixtures red against today's build, each for a reason the slice's row states. They add the declarations the journeys
   import (declarations are not protected, and a journey cannot compile against a thing that does not exist).
3. **The builder branches `goal-3/<slice>-build` from the check branch and opens its pull request into the check branch.** It
   fills handlers and the runtime, regenerates acme's `generated/`, deletes what moved, and edits the package tests (below). It
   writes no journey, eval, check, fixture or ratchet line beyond what the ratchet rule lets it remove. The `builder-paths` job runs on any
   pull request whose head ends in `-build` (`ci.yml:130-138`), but it is a required check only where the base is `main` or
   `goal/stage-1` (`CI-branch-protection.md`), so a red there would not stop a merge into the check branch. The 🔍 reviewer
   runs `tools/ci/builder-paths.sh goal-3/<slice>-check goal-3/<slice>-build` by hand and reads its output. On this pull request the jobs that hash the
   build's own output (checks 12, 14, 21, the compiler snapshot, who-may-call) are red for exactly those files, and the
   pull request says which.
4. **After the build merges into the check branch, the checks author adds the final commits:** recapture the three baselines with
   their `make-baseline.ts`, the compiler snapshot and the who-may-call fixture from the real build output, and review the diff
   line by line against the slice's "what moves" list. A line that list does not explain is a finding for the builder, not a
   recapture. The branch merges the base in, never rebases (`AGENTS.md`).
5. **The check pull request then merges into `goal/stage-1` with everything green.** Its head ends in `-check`, so the
   `builder-paths` job skips on it, and the build pull request was not required to pass it: the 🔍 reviewer of this final
   pull request re-runs `tools/ci/builder-paths.sh <check tip at the build's branch point> <the build's merge commit>` and
   pastes the output, and checks that the set of baseline keys that changed equals the set of `generated/` files the build
   pull request changed (the baselines are hash maps, so this is how "line by line" is read). No layer 1, layer 2 or m1 job is red on
   `goal/stage-1` between the pair's first commit and its last. The check branch itself is red until step 4, which is allowed:
   its base is not `main`, and `goal/stage-1` never sees it.

### Who edits what in a pair

| File | Edited by | Rule it follows |
|---|---|---|
| `examples/*/journeys/**`, `**/blueprint/journeys/**`, the evals, the runner's generic checks, `examples/*/test/fixtures/{evals,journeys,check}/**`, `e2e/**`, the ratchet lists | author | `builder-paths.sh`: a builder never writes or deletes them |
| the three baselines and the compiler snapshot | author, in the final commits | recaptured from the real output and reviewed (call 4) |
| `examples/*/blueprint/starting-worlds/**` | author | not protected; kept with the author because a world is a journey's setup, and its header says so |
| `examples/*/test/fixtures/layer2/**` | author | not protected, but a journey by content |
| the declarations a journey imports (a new thing, verb, error) | author, with a blank handler | not protected; written first so the journeys compile |
| `generated/**`, handlers, the runtime, a mount file | builder | not protected |
| a package test that uses acme's wire as seed data (`cap` in a POST body, a list of acme's operations, a scaffold file list) | builder | not protected, and it is the builder's unit test of the builder's own module |
| a package test that asserts an author-owned fixture (`starter.test.ts`, `prove.test.ts:103-110`) | author | it moves with the fixture |

## The trace, slice by slice

"Pair" means calls 1 to 5 apply. Every row is read against `builder-paths.sh`, the ratchet lists and the hashed files above. The
long lists (each file, each line) are in [`M2-auth.md`](M2-auth.md), "The pair map", and in the slice's row.

| Slice | Moves in acme | Protected files it forces | Pair |
|---|---|---|---|
| M2.03 | the model gains per-entry `via` and per-operation `agentTool`; `identity` becomes `issues` in every environment; `session.show` answers `via`; the generated server's `Principals.of` takes the door | acme's principal journeys (M2.02's second part) and their declarations; who-may-call; the three baselines; the snapshot | pair, check branch `goal-3/m2-03-check` |
| M2.04 | nothing: its done-when is that acme's `generated/` is byte for byte what it was | none | no; checks 12, 14 and 21 stay green unrecaptured |
| M2.05 | acme mounts auth: `person` and `session` leave; the server imports the identity entry; the model gains the mount and a `from` on each thing | acme's `sign-up-and-sign-in` copy, the `show` and `Person` imports in `invite-and-accept` and `grant-an-allowance`, who-may-call (it imports acme's `person` and `session`), the three baselines, the snapshot | pair, M2.25 |
| M2.06 | the mount's choices and settings, in `mounts`, which the model digest leaves out; the routes and pages are the plugin's | none | no; checks 12, 14 and 21 stay green unrecaptured, and if one byte of acme's `generated/` moves the slice becomes a pair before its build starts |
| M2.07 | `cap` leaves `organization.create` and the organisation; `acts` joins `api-key.create`; `allowance-policy` is new; acme mounts organizations and its six copies go | every sender of `cap`; acme's journey copies and retained journeys' imports; its worlds; who-may-call, `coverage/rename.ts`, `performance/grant.ts`; the baselines; the snapshot | pair, M2.23 |
| M2.08 | none: the runner's `--through` is builder code; its check is an `e2e/m2` file | none | no |
| M2.09 | `examples/starter` becomes the Plugged In template | the starter's five journeys and three planted fixtures, `layer1/01` and `06`, `layer2/05` and `services.ts`, `m1/25`, `starter.test.ts` | pair, M2.27 |
| M2.10, M2.11 | none that a check hashes: `git grep -E "examples/work" -- e2e` finds no reader | none | no |

Not traced here, and said so: M2.13 adds verbs to the wallet plugin, whose journeys are protected and which has no checks slice
(flagged to the conductor); M2.18, M2.20 and M2.22 are traced by their own checks slices (M2.17, M2.19, M2.21), and M2.18's "the
model's role kind" moves acme's model if it is written for rule roles, which makes it a pair. M2.17's author decides and says so in
its done-when.

## Not decided here

A ratchet list for layer 1 and layer 2 would let a check wait red on `goal/stage-1`, and would make pairs unnecessary for
checks that do not hash output. It is a new gate on the two jobs everything depends on; the pair costs two branches and
no new tool. Revisit if a third pair shows up.
