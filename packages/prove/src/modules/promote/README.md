# promote

`ortho promote --to staging|production` (D3 #14, #90 to #96). `Promote.to({ root, env, target, say })` moves the exact
bundle `ortho build` kept for the revision (the git commit) to an environment, and never rebuilds it.

- **Refusals come first,** and nothing is started for one: a stored runtime secret with no value in the target (M2.04, named one line each, `Secrets.missing`), a dirty working tree, a revision with no built bundle or one whose
  file no longer matches its recorded hash, and a revision without the verdicts. Staging needs a passing `test` verdict for
  every operation, production a passing verdict in the environment it `promotesFrom` (staging) for every operation, each
  the newest one posted from `main` (`Verdicts.latest`): a pull request's verdict never opens a gate. A refusal is
  `PromoteRefused`, with the lines to print (`refused: <rev> has no green verdicts in <env>`, then `missing: <ops>`).
- **Then the target environment runs that bundle:** started, or restarted onto it with its state kept (`Environments.up`
  with the revision), and `GET /_ortho/bundle` must answer the same revision and sha256.
- **Staging** is proved where it runs (`Prove.against`): the journeys and the nine evals, their people signing up for real
  through Better Auth because a real environment has no `/_world/cast`, judged from staging's own collector; a verdict per
  operation is posted with `environment: "staging"`, failing ones too.
- **Production** records the release in the logbook through `Releases.record`, with the version `Releases.next` gives, unless
  the revision is already the last release.
- **Publishing** (L2.06, D3 #111, `publish/`): staging, once its proof passed and before it posts its verdicts, publishes the prerelease
  `<next>-next.<n>` of the SDK and CLI under the dist-tag `next`; production, after `released <version>` and its verdicts, publishes the
  release (`latest`), and a revision that was already released publishes what is missing. Both go to `ORTHO_REGISTRY`, and say
  `skipped npm (...)` when there is none. Production writes the Homebrew formula only when `ORTHO_TAP_REPO` is set.
- What the local pass can't reach prints `skipped <destination> (cloud pass)`.

Test: `promote.test.ts`, the L2.05 done-when checks on a copy of acme under git, through the command, with the real logbook,
issuer and environments on ports 9030 to 9049.

After a staging proof, source must still be the captured clean full commit and staging must still be the same live
PID/revision/hash before any proof or publication fact is consumed. Publishing uses the captured Git source. The live
incarnation is checked again before final success facts; source edits after publication capture cannot affect packages.
Production publishes/verifies package bytes before NEW release/carried facts, then records only missing matching
carried passes. A retry after an interrupted release completes missing passes without duplicating complete rows.
