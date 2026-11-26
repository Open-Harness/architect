# GOAL18-getting-started-acceptance: slice 7 checks the page against the code; running its steps is slice 11's

Decided 26 November 2026 by Goal 18's lead, in the 🔍 review of #1111 (slice 7's checks). The building agent owns this
call (`AGENTS.md`, "Who decides"). It changes where a check lives, not what either slice delivers.

## The problem

Slice 7's checks, as first written, included check 09 (`e2e/m2/09-g18-7-getting-started.test.ts`). Check 09 builds
Orthograph, publishes it to a local registry, and runs the getting-started page's steps in an empty folder. It then
confirms for itself that the app was created, proved, run and called.

Two things were wrong with keeping it in slice 7:

- **It gives slice 7 a dependency the brief doesn't have.** Slice 7 is "After: —", but check 09 can't go green until
  slice 5 (publishing) and slice 6 (`ortho new app`) are on `main`.
- **It is most of slice 11's acceptance check.** It builds, publishes to a local registry, creates an app, proves it,
  runs it and calls it through the generated CLI. Two checks doing the same thing would be two copies to keep.

## The decision

1. **Slice 7 keeps the fast half.** These checks need no registry and no install:
   - `packages/cli/test/help-text.test.ts`: every command, flag and argument is described;
   - `readmes.test.ts`: the READMEs are not stale;
   - `getting-started.test.ts`: `docs/canon/getting-started.mdx` is held to the code.
   
   Check 09 and its ratchet list leave #1111.
2. **Check 09 becomes the start of slice 11's checks.** They are written on `goal-18/acceptance-check` into `main`, by a
   separate author, from check 09 as it stands at commit 754aa114 on `goal-18/getting-started-check`. They are
   extended to what slice 11 says: publish to a local registry, run `ortho new app`, declare one thing, generate, prove,
   run it, and call it through the generated CLI, SDK and MCP.
   - The getting-started page's steps are one of its inputs, once slice 7's page exists.
   - That check reuses `tools/e2e/starter.sh`'s registry and publish logic through one shared helper, not a third copy.
   - It refuses an `export` of `npm_config_*`, `pnpm_config_*`, `PATH` or `HOME` in the page's steps.
   - It fits inside a 20-minute job.
   - It says in its header that Verdaccio proxies every other dependency to npmjs.

## What was not chosen

- **Keeping check 09 in slice 7, with slice 7 after 5 and 6.** Slice 7 would wait on two other slices, and slice 11
  would duplicate the check.
- **Dropping the run of the page's steps.** A page that only contains the right words could pass the fast half alone.
  Slice 11 is where the steps are run, so the page is still judged by what it does.

## Supersedes

None. The brief's slice 7 and 11 rows gain words; none are replaced.
