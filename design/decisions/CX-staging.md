# CX-staging: the staging run takes Capxul's finish line

**Decided 25 November 2026** by Goal 16's checks author, under CX-takeover (no Claude-led goal runs, Goal 18 included,
so Goal 16 owns this framework change). Goal 16 is done when Capxul's books, HR, payroll, KYC, KYB and Bridge bank
account journeys are green in Capxul's staging (`design/goals/16-capxul.md`, `done_check`). Until now nothing ran Capxul
there: `.github/workflows/staging.yml` ran `--root examples/plugged-in` and one journey, by name, in its story step.

## 1. What the staging run takes

The dispatch chooses a **run** with one input, `app`, a choice of `plugged-in` (the default) and `capxul`. Each run is a
root and the journeys its story step proves, by name, in `e2e/staging/runs.mjs`. A choice and not free text, so nothing
typed at dispatch reaches a script; a root or a list typed at dispatch is refused by the workflow's own judge.

- A first step, `select`, runs `node e2e/staging/runs.mjs select "$APP" "$EVIDENCE/journeys.txt"`: it writes `ROOT=<root>`
  to `$GITHUB_ENV` and the run's journeys to a file, one name per line. It is the only step that writes `$GITHUB_ENV`.
  An unknown app or an empty list exits 2 there, before anything is made.
- plan, up and destroy take `--root "$ROOT"`; the story reads the file and gives each name its own `--only`, because
  journey names hold commas and apostrophes (`add, order and remove a link`, `branch names are the company's`). It refuses
  an empty list (`test "${#only[@]}" -gt 0`): an empty `--only` list would prove every journey.
- The journeys file is uploaded with the evidence. It holds only journey names.
- The story writes prove's report (`--report "$EVIDENCE/story.json"`), and a step after it, `judged`, fails the job
  unless the report holds every journey of the list once and no other (`runs.mjs judged`). It runs whenever the story
  ran, pass or fail. A prove that keeps one name, splits a name at its comma, or honours several names only against a
  local origin fails the live run here, whatever it printed.
- With nothing chosen the run is Plugged In's story, and the four commands are today's, argument for argument, with
  one addition: `--report <file>` on the story (`e2e/staging/workflow.test.mjs` runs the steps with a stand-in `ortho`
  and compares). It changes what is written, not what is proved.

`ortho prove --env staging --only` takes the flag any number of times and judges each named journey once (a name given
twice is judged once). A failing journey fails the run and every other named journey is still run and reported. A
name that is no journey is refused, exit 2, before anything is asked of the world. `--env local` keeps one `--only`;
several there are refused, exit 2, naming `--only`, so none is dropped without a word. `--env test` is unchanged.

`examples/capxul` declares `blueprint/environments/staging.ts`, a Worker on Cloudflare `workers.dev` with D1, as Plugged
In's does. Its plan is the model's: one Worker, one database, the `World` namespace, every name under
`ortho-capxul-stg-<run>`.

## 2. Capxul's list

`runs.mjs` lists Capxul's finish line by part: `books`, `hr`, `payroll`, `kyc-kyb` and `bank-account`, each journey by the
name `Blueprint.journey("<name>", …)` gives it. Today in `main` the books and payroll have no journeys (they are built on
`goal/capxul`), so their lists are empty and named as pending. HR is every Capxul journey that is not Bridge's. KYC and
KYB are the seven Bridge journeys about checking a person or a business. The bank account is the eight about accounts,
deposits and transfers.

The list is checked against the journey files (`e2e/staging/runs.test.mjs`): a name no file declares, a name listed
twice, a file whose name cannot be read, or two files with one name fails the check. So a renamed journey fails here
instead of being skipped by the staging run. When the books' and payroll's journeys land in `main`, the checks author
adds them to their parts. The parts are subsets, not "every journey", so a journey landing in `main` never turns it red.

## 3. The shape and the cap

One run is one up and one destroy, and a run that fails part way still destroys (`workflow.mjs`, `shape`). The judge
evaluates each step's `if` as GitHub does and walks the job with each step failing in turn. Whatever fails, destroy runs
exactly once, up at most once, and up never runs after `select`, the plan or the first listing failed. The job fails on
any failure. A Capxul run makes the same three resources Plugged In's does and lives for one job of at most 30 minutes,
so the $10 a day cap (AGENTS.md) holds as it did for Goal 3's staging. Runs never overlap (`concurrency: staging`).
When `select` fails no `ROOT` is set, so the destroy that always runs fails on an empty root: nothing was made, and the
job is already red.

What is judged only by the first live run, not offline: that `up` deploys what its plan says (the listing judge,
`made`) and that `destroy` touches only its own run (`untouched`). A build whose real `up` or `destroy` differs from
its `--plan` passes check 50 and fails there.

## 4. Open: two calls for Aaron

These are not decided here, and nothing in this change depends on them:

1. **Where the Bridge journeys run in staging**: Bridge's own sandbox, or the stand-in deployed beside the Worker. The
   KYC, KYB and bank account parts are on the list either way. Until Aaron decides, a `capxul` dispatch proves them
   against whatever Capxul's staging Worker is wired to, so don't dispatch it as the finish line yet.
2. **Any new secret** the staging run would hold (a Bridge sandbox key, if the first answer is Bridge's sandbox). The
   workflow still holds exactly `secrets.CLOUDFLARE_API_TOKEN` and `vars.CLOUDFLARE_ACCOUNT_ID`, and its judge refuses
   any other expression. No credential was created for this change.

## Where it is checked

| Check | File |
|---|---|
| 1. the workflow takes a root and a list; the default is today's run | `e2e/staging/workflow.test.mjs` (`workflow.mjs`) |
| 2. several `--only`, each run and reported, one failing fails the run | `e2e/m1/50-cx-staging-capxul.test.ts` |
| 3. Capxul's plan with no credential and no network; destroy removes what up made | `e2e/m1/50-cx-staging-capxul.test.ts` |
| 4. Capxul's list by name, held to the journey files | `e2e/staging/runs.test.mjs` |
| 5. one up, one destroy, a failed run still destroys | `e2e/staging/workflow.test.mjs` (`shape`) |

## Supersedes

- `e2e/staging/workflow.mjs`: "workflow_dispatch takes no inputs: the run is named by its id" → "workflow_dispatch takes exactly one input, app"
- `e2e/staging/README.md`: "The story step calls `ortho prove --env staging --run <id> --only "a person claims a page and shares it"`" → "The story step calls `ortho prove --env staging --run <id> --root "$ROOT"` with one `--only` per journey of the chosen run"
- `e2e/staging/README.md`: "the evidence is those five named files" → "the evidence is those seven named files"
- `e2e/staging/README.md`, the story's row: "| the story | none |" → "| the story | token, account |"
- `.github/workflows/staging.yml`: "It plans, deploys Plugged In to Cloudflare `workers.dev`, runs the story" → "It plans, deploys the chosen app to Cloudflare `workers.dev`, runs its journeys"
