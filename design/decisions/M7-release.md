# M7.13: the release pass, each credential with Aaron's written yes

Written 22 November 2026 by the Goal 15 lead, under "Who decides" in `AGENTS.md` (`design/milestones.md`, M7.13;
`design/goals/15-release.md`, slice 1). It lists every credential the rest of M7 needs, what each may do, where it is
held and what it costs. A credential is used only after Aaron's written yes for that one, recorded below with his words
and the date. No agent creates a credential, reads one, prints one or writes one to a file, a log or a commit.

**Status: asked.** The batched ask went to Aaron and the conductor on 22 November 2026. Nothing below is approved yet.

## The rule for every credential

1. **Aaron makes it.** He signs in, creates the account, key or token, and puts it straight into a GitHub Actions
   secret. Agents never see the value.
2. **One place it lives.** Release credentials sit in a GitHub environment `release`, open only to `main` and to tags
   `v*`. Staging credentials sit in the existing `staging` environment (K28), open only to `main` and `goal/*`.
3. **Least scope.** Each one can do only what its slice needs, on resources with the Orthograph prefix.
4. **No stored secret where an identity will do.** npm publishing, GitHub releases and signed verdicts use GitHub's own
   OIDC identity and the workflow's own token, so nothing long-lived is stored for them.
5. **Everything made is destroyed.** Every test world, monitor and contract run is torn down by the job that made it,
   and a listing afterwards fails the job if anything with the run's prefix is left.

## The credentials

| # | Credential | For | What it may do | Where | Cost | Aaron's yes |
|---|---|---|---|---|---|---|
| 1 | The npm org `@orthograph` and the name `orthograph`, then npm trusted publishing for each package | M7.02, M7.06 (and Goal 3's preview, M1.51) | publish `@orthograph/*`, `orthograph` and the preset, from `release.yml` only | npmjs.com; no token stored: npm trusts the workflow's OIDC identity. Trusted publishing is set per package, so Aaron adds it once each package exists, after the preview's first publish | $0 (public packages) | waiting |
| 2 | A Homebrew tap repository `Open-Harness/homebrew-tap` and a deploy key with write access to it alone | M7.06 | push formula updates to that one repository | private half as the secret `HOMEBREW_TAP_DEPLOY_KEY` in `release` | $0 | waiting |
| 3 | The workflow's own `GITHUB_TOKEN` with `contents: write`, and GitHub's OIDC token (`id-token: write`) | M7.05, M7.06 | make GitHub releases; sign each verdict with the run's identity | issued per run by GitHub; nothing stored | $0 | waiting |
| 4 | The existing Cloudflare token (`CLOUDFLARE_API_TOKEN`, `M7-cloud.md`), now also for a test world per pull request | M7.05, M7.07, M7.09 | the same scope as staging, on names carrying the Orthograph prefix for the test environment and the run, formed in code as staging's is | the existing `staging` environment | inside Workers Paid, already $5 a month; at most 20 worlds a day, each destroyed | waiting |
| 5 | A Stripe account in test mode and a restricted test key | M7.07 | test-mode products, prices, customers, checkout and webhook endpoints; no live mode | the secret `STRIPE_TEST_KEY` in `staging` | $0 (test mode never charges) | waiting |
| 6 | A fresh deployer wallet on Base Sepolia that only ever holds faucet test ETH | M7.09 | deploy and verify the vault contracts on the test network | the secret `TESTNET_DEPLOYER_KEY` in `staging`; the public RPC and Blockscout verification need no key | $0 (faucet funds) | waiting |
| 7 | Axiom: a dataset `ortho-staging`, an ingest token, a read-only query token, and a token that may create and delete monitors and notifiers | M7.08, M7.14 (and the staging traces `M7-cloud.md` still lacks) | ingest staging traces; let an unattended builder read them, redacted; write and destroy the generated monitors | secrets `AXIOM_INGEST_TOKEN`, `AXIOM_QUERY_TOKEN`, `AXIOM_MONITOR_TOKEN` in `staging` | $0 on Axiom's free plan at our size (estimated) | waiting |
| 8 | A fine-grained GitHub token limited to issues on this repository, held only by Axiom's notifier | M7.14 (the builder route) | open an issue when a staging monitor fires | inside Axiom's notifier, never in the repository | $0 | waiting |

**Total new spend: $0 a month.** The one paid item is the Cloudflare plan Aaron already pays ($5 a month). The $10 a
day cap stands across everything; a run's spend is read afterwards from Cloudflare's billing page, which only Aaron
can open.

## What is not asked

- **Grafana.** M7.14 writes monitors to each sink the environment declares. Staging declares Axiom alone, so the
  Grafana exporter is built and compiled but not run against a live Grafana until a later ask.
- **A block explorer key.** Blockscout and Sourcify verify contracts without one.
- **A paid RPC.** Base Sepolia's public RPC is enough for a few deploys a day; a rate-limit failure would come back as
  a new ask.
- **Production.** Nothing pages a person and nothing deploys to production without its own written yes (K18, M7.14).

## How each yes unblocks a slice

| Slice | Needs |
|---|---|
| 2 · npm org and the first real release (M7.02) | 1 |
| 3 · Real releases: npm, Homebrew, GitHub (M7.06) | 1, 2, 3 |
| 4 · Test worlds and signed verdicts from CI (M7.05) | 3, 4 |
| 5 · Adapters against real vendors' test modes (M7.07) | 4, 5 |
| 6 · The builder's read-only staging telemetry (M7.08) | 7 |
| 7 · Contracts on a testnet (M7.09) | 4, 6 |
| 8 · Monitors to the sink (M7.14) | 7, 8 |

Journeys and checks for every slice are written before its yes arrives; only the run against the real service waits.

## Aaron's answers

None yet.
