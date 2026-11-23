# M7.01: the cloud pass for staging

Decided 20 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`, for staging alone (K10 section 8;
`design/milestones.md`, M7.01). Production, npm and the rest of M7 still wait on the stage 4 gate. M7.01's row
needs Gate M2; Goal 3 puts staging inside stage 1 and orders M7.01 first, so it is taken now (G10).

## Aaron's yes

- K10, round 2, Q7 = A ("All recommended."): a new account for Orthograph staging alone, on Workers Paid ($5 a
  month), with a token scoped to that account, which he creates himself (`K10-factory.md`, section 8 and its
  answers).
- Goal 3, 19 November 2026: "This should also include a staging deployment", on `workers.dev` with no domain. He set
  the `CLOUDFLARE_ACCOUNT_ID` repository variable and the `CLOUDFLARE_API_TOKEN` repository secret that day.

No other cloud credential is made. If staging needs one, the work stops and asks Aaron.

## The account and the token

- **Account:** the one `CLOUDFLARE_ACCOUNT_ID` names. It was assumed here to be K10's dedicated staging account; it is
  not (see the addendum below).
- **Token:** `CLOUDFLARE_API_TOKEN`, scoped by Aaron to that account. K10 asks for Workers Scripts, D1, Durable
  Objects, R2 and Containers, all edit.
- **Where they are used:** only inside GitHub Actions, as `secrets.CLOUDFLARE_API_TOKEN` and
  `vars.CLOUDFLARE_ACCOUNT_ID`. No agent reads, prints, copies or writes either value. No local run uses them, and no
  file or log holds them.
- **Checking the scope:** the token's scope is not read from the token. It is shown by what a run can and cannot do:
  the first staging pass records each call the account refused, if any. So this decision records the scope K10 asks
  for, not the scope the token has; `spikes/staging-pass` records what it was allowed to do.

## Which secret store `Cloudflare.secrets` means

**Per-Worker secrets, not the account-level Secrets Store.** A runtime secret, such as Better Auth's signing secret,
is set on the Worker it belongs to, and it goes when the Worker is destroyed. The account-level Secrets Store keeps
values apart from any Worker, so `ortho env destroy` would have to find and delete them as well. That makes it easy
to leave something behind.

A staging run makes its runtime secrets fresh in the job, from random bytes. It never prints them and never stores
them anywhere but on the Worker, so destroying the Worker leaves nothing. This answers the open question in
`design/frame/secrets.md`.

## Cost under the cap

Known: the account is on Workers Paid, $5 a month (K10), already Aaron's. Estimated, not measured: a run's own use.

| What | Cost | Known or estimated |
|---|---|---|
| Workers Paid, the account's plan | $5 a month | known (K10) |
| One staging run: a few thousand requests, a few D1 databases and Durable Object namespaces, minutes long | about $0, inside the plan's included requests, D1 rows and Durable Object use ([Cloudflare's Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | estimated |
| R2, if a run makes a bucket | about $0 for a run's size, inside R2's free tier | estimated |
| Containers | not used: Plugged In needs no container in staging. Containers bills by memory, CPU and disk used, so any later use is costed before it runs | known |

The cap is $10 a day across everything. Staging runs only by hand or from Goal 3's lead, at most ten a day, and each
one destroys what it made. The job fails when anything of Plugged In is left in the account. A run's spend is seen
afterwards on the account's billing page, which only Aaron can open; the first staging pass asks him to look once.

## How a run goes

1. One GitHub Actions workflow, started by hand, does up, the story, the evidence and destroy in one job.
2. Destroy runs even when the story fails.
3. After destroy, the job lists the account's Workers, D1 databases, Durable Object namespaces and R2 buckets, and
   fails if any of this run's remain.
4. It touches only names with this run's prefix, never anything else in the account.
5. The old `codex/links-staging` branch has no teardown and is never run.

**First pass, early:** `spikes/staging-pass`, Plugged In as it stands, deployed with the plainest tools. It finds
the cloud snags before M7.03 and M7.04 are built.

**Final pass, at the end:** `ortho env up staging` and `ortho env destroy staging` (M7.03, M7.04), for the
evidence.

## Addendum, 20 November 2026: one account for every environment, for now

The first staging pass (`spikes/staging-pass`, #198) found the account already holding 18 Workers, 12 Durable Object
namespaces and 6 R2 buckets. Aaron, asked through the conductor: "it's not just staging... Staging, production's going
to be there... for now, nothing important is actually working there anyway... It's all like experimentation right
now." So the account is the one Orthograph uses for every environment, for now. The conductor's rule:

1. **One prefix, from one place.** Everything Orthograph makes there carries a prefix naming Orthograph, the app and the
   environment, then the run: `ortho-pluggedin-stg-<run>`. The prefix is computed in one place in code, from the
   app's name, the environment and the run, and never typed by hand.
2. **Destroy touches only its own run.** Destroy deletes only what carries its own run's prefix. Its account listing
   afterwards fails the job if a resource with that prefix is left, and nothing deletes or changes a resource without
   it. A check covers both: a planted leftover fails the job, and a planted unprefixed resource is untouched.
3. **What was there before is not ours.** The 18 Workers, 12 Durable Object namespaces and 6 buckets present before
   Goal 3 are never touched, read only by the listing.
4. **Later, one account per environment.** When production holds real data, each environment gets its own account
   (`design/later.md`).

Still Aaron's to do: move the account id from a repository variable to a secret (the repository is public, so the id
shows in Actions logs), and give staging an Axiom dataset and ingest token for its traces. Until then staging runs
without traces.

## Addendum, 21 November 2026: how long a staging name may be

Every staging name is `ortho-<app>-stg-<run>-…`, so a long app or store name can push one past Cloudflare's limit. Workers on
`workers.dev` take at most 63 characters (Cloudflare's workers.dev page: "Must be 63 characters or less"). Cloudflare states no limit for a
D1 database name as of today, so D1 is held to the same 63, to be safe. The plan refuses (exit 2, no plan) a name that would pass
either; check 37 pins it (`e2e/m1/staging-plan.ts`). The lead's call, 21 November 2026; it only refuses, so raising it later
breaks nothing.

## Addendum, 21 November 2026: prove against staging belongs to M7.04

`ortho prove --env staging --run <id>` (what the hand-run staging workflow's "the story" step calls, `.github/workflows/staging.yml`) had no slice. The goal
file's Staging section puts "the story" in the M7.03/M7.04 workflow, and the story needs a deployed Worker to judge, so it goes to **M7.04** (deploy and destroy),
which makes the Worker. The lead's call, 21 November 2026. Check 41 (`e2e/m1/41-m7-04-prove-staging.test.ts`) pins it: the address is `<prefix>-worker.<subdomain>.workers.dev`
from check 37's prefix and the variable `ORTHO_STAGING_SUBDOMAIN` (set by the workflow from the output of an earlier `subdomain` step, `e2e/staging/subdomain.mjs`, which holds the token and reads the account's
subdomain with `GET /accounts/<id>/workers/subdomain`, writing only `subdomain=<name>` to the step output and printing nothing of the response; the story step holds none); `ORTHO_STAGING_ORIGIN` (loopback only) replaces the address so the same code is judged against a world
served on this machine. Prove judges the journeys and not the nine evals (staging has no collector until an external sink is set). The workflow's `--only` now names
the story's real journey, "a person claims a page and shares it": `--only "the story"` matched no journey.

## Supersedes

- design/frame/secrets.md: "which one `Cloudflare.secrets` means is a" → "`Cloudflare.secrets` means each Worker's own secrets, not the account-level Secrets Store"
- design/milestones.md: "orthograph-staging" → "the Cloudflare account Aaron uses for every environment for now, every resource prefixed"
- design/milestones.md: "run for staging on the dedicated account" → "run for staging on the shared, prefixed account"
- design/milestones.md: "acme up on a dedicated" → "acme up on the shared, prefixed"
- design/milestones.md: "the account listing nothing after" → "the account listing nothing of the run's after"
- design/milestones.md: "leaves nothing in the account" → "leaves nothing with its run's prefix in the account and changes nothing without it"
- design/goals/03-stage-1-hill-climbed.md: "and the account empty afterwards" → "and the listing showing nothing with the run's prefix afterwards"
- .agents/skills/kanban/data/lanes.json: "a dedicated staging account under the $10 a day cap" → "the shared, prefixed Cloudflare account under the $10 a day cap"
