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
| `05-release-workflow` (+ `release-workflow.ts`) | `.github/workflows/release.yml` starts on a pushed tag `v*` alone, every job in the `release` environment; a `preflight` job everything needs checks the tap's deploy key and the tag's agreement with every package's version; one job publishes to npm with `id-token: write` and provenance, no token anywhere; one makes the GitHub release and pushes the tap, holding `contents: write`, with the deploy key in the last step only; no job holds both permissions; every `run:` is on an allowlist (the install, the build, and the named steps, each exactly: the release step is `--root examples/acme` only, the key lives in a file under `$RUNNER_TEMP` that an always-run step removes) | the `credentials` step is run by bash with and without the key |
| `06-release-publish` | `tools/release/release.mjs check\|publish`: the tag and every public package's version agree (exit 1 naming the package and both versions), a tag that is not `v<semver>` is refused, nothing is sent from a run that cannot finish (unbuilt package, disagreement, no registry off Actions, npm's own registry off Actions), `latest` goes only to a release, a prerelease tag is refused by `check` and `publish` (prereleases are M1.51's), a run can be started again; each test has its own registry | a real Verdaccio, the real `pnpm publish` and `npm install`, in an empty folder |
| `07-release-real-packages` | the repository's own public packages (`orthograph`, `@orthograph/cli`, the preset among them) agree on one version, release at a stamped version to a registry and install from it, and `ortho --version` prints that version | the real build of every package, a real Verdaccio with npmjs.org as its uplink, a real `npm install` |
| `08-release-github-and-tap` | `ortho publish --release` makes the GitHub release with the binary and its sha256 and commits a formula naming the release's address and that sha256 beside the other formulas; `--push-tap` pushes it to the tap; a wrong sha256 fails `brew install`, and the installed binary runs a real command (`--help` lists the model's groups); refuses before anything is sent, and a prerelease tag with exit 2; run under `deny-network.mjs` with the runner's own Node in `ORTHO_CACHE`; a machine without Homebrew fails it, never skips | a real HTTP server for GitHub's three addresses (`github-standin.ts`), a bare git repository for the tap, real Homebrew, the real `ortho` on a copy of acme |

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
