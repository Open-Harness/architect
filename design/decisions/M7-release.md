# M7.13: the release pass, each credential with Aaron's written yes

Written 22 November 2026 by the Goal 15 lead, under "Who decides" in `AGENTS.md` (`design/milestones.md`, M7.13;
`design/goals/15-release.md`, slice 1). It lists every credential the rest of M7 needs, what each may do, where it is
held and what it costs. A credential is used only after Aaron's written yes for that one, recorded below with his words
and the date. No agent creates a credential, reads one, prints one or writes one to a file, a log or a commit.

**Status: granted, items 1 to 8, on 22 November 2026** (see "Aaron's answers"). Items 7 and 8 are limited by what
Axiom's free plan allows; the part that does not fit is an open question to Aaron, below.

## The rule for every credential

1. **Aaron makes it.** He signs in, creates the account, key or token, and puts it straight into a GitHub Actions
   secret with `gh secret set`, which reads the value from a hidden prompt. Agents never see the value.
2. **One place it lives.** Release credentials sit in a GitHub environment `release`, open only to `main` and to tags
   `v*`; the lead creates the empty environment, Aaron adds the secret. Staging credentials sit in the existing `staging`
   environment (K28), open only to `main` and `goal/*`. The Cloudflare token stays the repository secret it already is
   (`M7-cloud.md`), so a pull request's job can reach it; a pull request from a fork gets no secrets at all.
3. **Least scope.** Each one can do only what its slice needs, on resources with the Orthograph prefix.
4. **No stored secret where an identity will do.** npm publishing, GitHub releases and signed verdicts use GitHub's own
   OIDC identity and the workflow's own token, so nothing long-lived is stored for them.
5. **Everything made is destroyed.** Every test world, monitor and contract run is torn down by the job that made it,
   and a listing afterwards fails the job if anything with the run's prefix is left.

## The credentials

| # | Credential | For | What it may do | Where | Cost | Aaron's yes |
|---|---|---|---|---|---|---|
| 1 | The npm org `@orthograph`, the name `orthograph` (claimed by the preview's first publish), then npm trusted publishing for each package | M7.02, M7.06 (and Goal 3's preview, M1.51) | publish `@orthograph/*`, `orthograph` and the preset, from `release.yml` only | npmjs.com; no token stored: npm trusts the workflow's OIDC identity. Trusted publishing is set per package, so Aaron adds it once each package exists | $0, known: public packages are free | yes |
| 2 | A Homebrew tap repository `Open-Harness/homebrew-tap` and a deploy key with write access to it alone | M7.06 | push formula updates to that one repository | private half as the secret `HOMEBREW_TAP_DEPLOY_KEY` in `release` | $0, known: public repositories are free | yes |
| 3 | The workflow's own `GITHUB_TOKEN` with `contents: write` and `checks: write`, and GitHub's OIDC token (`id-token: write`) | M7.05, M7.06 | make GitHub releases; sign each verdict with the run's identity; show the verdict on the pull request as its own check run | issued per run by GitHub; nothing stored | $0, known | yes (`checks: write` is within its asked purpose, "sign each pull request's result", and is named in the follow-up to Aaron) |
| 4 | The existing Cloudflare token (`CLOUDFLARE_API_TOKEN`, `M7-cloud.md`), now also for a test world per pull request | M7.05, M7.07, M7.09 | the same scope as staging, on names carrying the Orthograph prefix for the test environment and the run, formed in code as staging's is | the existing repository secret; the job runs only for pull requests from this repository, in its own workflow | inside Workers Paid, already $5 a month, known; a world's own use about $0, estimated as in `M7-cloud.md`; at most 20 test worlds a day, on top of staging's ten runs, each destroyed | yes |
| 5 | A Stripe account in test mode and a restricted test key | M7.07 | test-mode products, prices, customers, checkout and webhook endpoints; no live mode | the secret `STRIPE_TEST_KEY` in `staging` | $0, known: test mode never charges | yes |
| 6 | A fresh deployer wallet on Base Sepolia that only ever holds faucet test ETH | M7.09 | deploy and verify the vault contracts on the test network | the secret `TESTNET_DEPLOYER_KEY` in `staging`; the public RPC and Blockscout verification need no key | $0, known: faucet funds | yes |
| 7 | Axiom: a dataset `ortho-staging`, an ingest token, a read-only query token on that dataset, and a token that may create and delete monitors and notifiers | M7.08, M7.14 (and the staging traces `M7-cloud.md` still lacks) | ingest staging traces; let an unattended builder read them, redacted; write and destroy the generated monitors | secrets `AXIOM_INGEST_TOKEN`, `AXIOM_QUERY_TOKEN`, `AXIOM_MONITOR_TOKEN` in `staging` | free plan, $0, known; but see "What Axiom's free plan does not fit" | yes, for the free plan |
| 8 | A fine-grained GitHub token limited to issues on this repository, held only by Axiom's notifier | M7.14 (the builder route) | open an issue when a staging monitor fires | inside Axiom's notifier, never in the repository | $0, known | yes, made only when the route can use it |

**Total new spend: $0 a month** while everything stays on free plans. The one paid item is the Cloudflare plan Aaron
already pays ($5 a month). The $10 a day cap stands across everything; a run's spend is read afterwards from
Cloudflare's billing page, which only Aaron can open.

## How the builder reads staging traces (M7.08)

An unattended builder never holds `AXIOM_QUERY_TOKEN`. It starts a workflow in the `staging` environment that runs the
query, redacts the result and uploads it as the run's artifact; the builder reads the artifact with `gh`. The token
stays inside GitHub Actions, as the Cloudflare token does.

## What Axiom's free plan does not fit

Axiom's limits page (read 22 November 2026, `axiom.co/docs/reference/limits`) gives the free Personal plan **3 monitors**
and only **Email and Discord** notifiers. M7.14 writes a monitor per derived rule (a latency objective per budget, a
defect objective per operation, and more, K18), far more than 3, and its builder route needs a webhook. So:

- Items 7's ingest and query tokens, and M7.08, work on the free plan as granted.
- M7.14's monitors and item 8's route do not. The options, asked of Aaron when M7.14 is ready to run (it waits on
  Goal 3's M1.49 first):
  1. **Axiom Cloud, $25 a month plus usage** (pricing page, "Platform fee + usage"), 500 monitors and every notifier,
     about $0.83 a day, under the cap. Recommended: Axiom is the sink K18 and the environment file already name.
  2. **Grafana Cloud's free tier.** Its pages do not state the alert-rule limit or whether a webhook contact point is
     free, so it would need a spike first.
  3. **Stay free and run only 3 monitors in staging.** Not recommended: it stops proving that every rule falls out.
- Item 8 is made only once the route can carry it.

## What is not asked

- **Grafana**, beyond option 2 above.
- **A block explorer key.** Blockscout and Sourcify verify contracts without one.
- **A paid RPC.** Base Sepolia's public RPC is enough for a few deploys a day; a rate-limit failure would come back as
  a new ask.
- **Production.** Nothing pages a person and nothing deploys to production without its own written yes (K18, M7.14).

## How each yes unblocks a slice

| Slice | Needs | Also waits on |
|---|---|---|
| 2 · npm org and the first real release (M7.02) | 1 | the preview's first publish (M1.51, Goal 3) |
| 3 · Real releases: npm, Homebrew, GitHub (M7.06) | 1, 2, 3 | slice 2 |
| 4 · Test worlds and signed verdicts from CI (M7.05) | 3, 4 | M7.04 (Goal 3) |
| 5 · Adapters against real vendors' test modes (M7.07) | 4, 5 | M7.04 (Goal 3) |
| 6 · The builder's read-only staging telemetry (M7.08) | 7 (ingest, query) | M7.04 (Goal 3) |
| 7 · Contracts on a testnet (M7.09) | 4, 6 | M7.04 (Goal 3) |
| 8 · Monitors to the sink (M7.14) | 7 (monitors), 8, and the Axiom plan question | M1.49 (Goal 3) |

Journeys and checks for every slice are written before its run; only the run against the real service waits.

## Aaron's answers

- **22 November 2026, items 1 to 8: yes.** His words, to the conductor, relayed to this goal the same day: "yeah, there
  has been granted if it needs anything else specific from me, then it should ask me directly". The ask he answered is
  on #417. The steps he takes himself, and the Axiom plan question, go to him directly, in the order the slices need
  them.
