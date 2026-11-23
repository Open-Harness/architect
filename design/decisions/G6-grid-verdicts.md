# G6: the grid's verdicts go to a file first, in the logbook's shape

Decided 19 November 2026 by the checks author, under "Who decides" in `AGENTS.md`.

**The call.** `nx run e2e:grid` writes its verdicts to `e2e/grid/out/verdicts.json` (not committed), not to the logbook.

**Why not the logbook now.**
- The logbook (`packages/logbook`) accepts writes only with an OIDC token from the one issuer its environment names. That token exists
  only in a CI job on the repository; a local run, a unit test and the e2e project cannot hold one, and no key is ever created for it.
- It keys verdicts by `operation` and `environment`, not by grid cell. Posting needs a mapping, which is chosen below.
- The portal's Proof page, which reads them back, is M1.13.

**The shape.** `Report.verdicts` is the logbook's `VerdictInput` with the cell in the `operation` slot as `<block>.<output>:<subject>`
(`error.cli:HandleTaken`), `verdict` `pass` or `fail`, and `revision` and `environment` as the report's own. Nothing else is
needed to post one.

**What moves it to the logbook.** Goal 3's done check says "with its verdict in the logbook". A CI step on `goal/stage-1`, which holds
the OIDC token, reads `verdicts.json` and posts each entry with `Verdicts` (`@orthograph/prove`) or the logbook's HTTP route. That step is
the only change: the runner, the evals and the file stay. The step (and an artifact upload of the file, which no workflow does yet) is added by the
conductor before the done check runs, or with M1.13's Proof page, whichever lands first; this note is then marked done.
