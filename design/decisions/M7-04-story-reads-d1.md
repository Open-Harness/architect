# M7-04-story-reads-d1: the staging story reads its facts from D1, with the operator's credential

Goal 3's lead, 21 November 2026. A goal's own call, named by slug (K32).

## The problem

`ortho prove --env staging --run <id>` (M7.04's prove side, #445) runs Plugged In's story against the deployed Worker. Its
`emits`, state and role steps read the run's rows and journal. Locally they come from the world's facts door,
`/_world/facts/*`, but a deployed Worker answers 404 there by design (`decisions/D3.md` #126). `decisions/D3.md` #127
already says where staging's facts come from: "In the cloud pass the same two reads go to D1's API with the
operator's own credential, behind the same seam." #445 builds that `Facts` (`Journeys.d1Facts`), which needs
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Check 41 (`e2e/m1/41-m7-04-prove-staging.test.ts:206`) and the workflow's own guard (`e2e/staging/workflow.mjs`) say
the story step holds no credential. They were written before #127's cloud half was built. So #127 and the checks
disagree, and the story could never read a fact on staging.

## Decided

1. **The story step carries the same two variables `up` and `destroy` carry, and nothing else secret:**
   `CLOUDFLARE_API_TOKEN` from the Actions secret and `CLOUDFLARE_ACCOUNT_ID`. It uses them only to read the run's own
   databases, which it finds by the plan's prefix and never by a typed id.
2. **The blast radius does not grow.** Within the same job, the `up` step already runs the repository's code with the
   same token: the generated Alchemy stack and the build. The story runs the repository's own journeys. A journey is
   blueprint code in this repository, never a user's input.
3. **Redaction is the same rule as `up`'s.** No error line that prove prints holds the token or the account id. The
   facts reader replaces both before an error surfaces, as `clip()` does
   (`packages/cli/src/modules/staging/internal/stack.ts`).
4. **The checks keep their intent, narrowed.** Check 41 and `workflow.mjs` stop forbidding the two variables on the
   story step. They now require exactly those two plus `ORTHO_STAGING_SUBDOMAIN`, the credential taken from the same
   secret and variable as `up`'s, and no other `secrets.` expression. A checks author amends them (they are checks),
   on the paired branch `goal-3/m7-04-check` (G12).

## Rejected

- **A credentialed facts route in the Worker.** It is a door in staging however it is locked, and `D3.md` #127
  rejected it.
- **Facts from telemetry.** The evals would then judge the server by what it says of itself, and `stored` and
  `mayCall` need the rows (#127).
- **A step that dumps D1 before the story.** The reads happen between steps, so one snapshot cannot answer them.

## Supersedes

- `.github/workflows/staging.yml`: "not a secret; the story itself holds no credential" → "the story reads the run's own D1 databases with the operator's credential (M7-04-story-reads-d1)"
