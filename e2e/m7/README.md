# M7's checks: test worlds and signed verdicts from GitHub Actions (M7.05)

Written before any of M7.05 is built, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come first"; the
`author` skill). They judge the milestone row "a pull request gets a verdict signed with GitHub's OIDC token" from
`design/milestones.md`, through credentials 3 and 4 of `design/decisions/M7-release.md`. Goal 15 owns this folder; Gate M7
(M7.12) grows `nx run e2e:m7` with the other slices' checks.

Nothing here reaches Cloudflare, GitHub or any cloud, and nothing reads a credential. The parts that can only run in the cloud
(the workflow, the account listing) are pinned by their text, the way check 41 pins `staging.yml`; every part that can run on
this machine runs for real: the logbook on workerd, an OIDC issuer process, the `ortho` command, an HTTP server standing in
for the API it calls.

| Check | What it proves | Real parts |
|---|---|---|
| `01-test-worlds-workflow` | `.github/workflows/test-worlds.yml` is what its promises say: shown as `ortho / prove (test)`; ready pull requests from this repository only; refuses without the two credentials and past the day's cap; plans, lists, stands the world, proves, then always destroys and lists again, failing on a leftover with the run's prefix or a change without it; the job alone holds `id-token: write` and nothing names a token | the `credentials` step is run by bash with and without the variables |
| `02-test-world-plan` | `ortho env up\|destroy test --plan --run <id>` plans what the model needs under `ortho-<app>-test-<run>`, from the one prefix function; without `--plan` and without credentials both refuse before anything is made | the real `ortho` on copies of Plugged In |
| `03-signed-verdicts` | `ortho prove --env test` signs with the runner's token, asked for the logbook's audience, and each verdict is stored with the PR's provenance; the logbook gives 401 to another issuer, a forgery, the wrong audience, repository, workflow or ref, an unsigned or changed or expired token, and each leaves the ledger as it was; a pull request's token cannot record a release | the real logbook (workerd), the real issuer process, a real HTTP server for the runner's token request, the real `ortho prove --env test` |
| `04-world-cap` | `tools/release/world-cap.mjs` counts today's runs of the workflow and refuses past `WORLD_CAP` (20), and refuses rather than guess when it cannot count | the real script against an HTTP server standing in for GitHub's API |

A world killed mid-run is gone after its lifetime: `packages/prove/src/modules/test-worlds/test-worlds.test.ts` (L2.02) already
kills a `prove --env test` with SIGKILL and finds the world removed by `worlds reap` after its lifetime. Check 01 adds that the
workflow's job ends before a world's lifetime and that its clean-up steps run on a cancel. What it does not judge, a runner
that dies outright with a per-run stack up, is an open decision in the pull request.

## Running them

```bash
pnpm nx run e2e:m7-ratchet
```

runs the ratchet's own test, then every check, then compares the failures with `expected-failing/` (one file per check;
`../ratchet/README.md`). It passes while every failure is listed. `pnpm nx run e2e:m7` runs the checks alone, and is
Gate M7's check, with the other slices' checks beside these, once the list is empty.

When a slice lands, the ratchet prints `newly passing, take it off the list` for each: delete those lines (and a file
when its last line goes) in the same pull request. Nobody adds a line without the author.
