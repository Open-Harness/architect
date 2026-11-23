# GOAL17-agents-checks: six calls the slice 8 checks needed, and how their fairness is judged

Decided 23 November 2026 by Goal 17's lead, on the 🔍 review of PR #703 (slice 8's checks), under "Who decides" in `AGENTS.md`. It changes no call of
Aaron's. The checks are `e2e/superagent/40` to `48` and `harness-01`; their README says what each reads.

## The calls

**A. A check never moves the clock while a model turn is held.** A request parked at the stand-in must not keep the world busy (GOAL17-check-harness,
call 3), but until `Timers.within` gives its token back, `advance` with a turn held answers `NeverQuiet`. So every journey that advances the clock
first lets the model go, or scripts a turn that answers at once and parks the Agent's idle instead (`a-close-is-resent…`, `reap-closes…`). The
pause journey's eval is started by hand and its main agent answers without deciding it, so the eval stays `delivered` and its clock runs. A check
that reads a model call's deadline is the only one that may advance past a held turn, and slice 8 has none.

**B. `assignment.waiting` reads person first, then oldest,** as GOAL17-executor-slots section 9 sketches and GOAL17-names call 3 says. Slice 5's build
declares `order: "oldest"` on the read; slice 9's build changes it to the line's order (`slots.line`). The journeys keep the person-first order
(`a-full-pool…`, `promoted-is-skipped…`), so they are red on that point until it does.

**C. `outgoing-message.reply` belongs to the main agent and the system.** The executor speaks through `ticket.ack` (its `allowed` is `itsAgent`). That is
what slice 5's blueprint says, and the brief's row is rewritten to match. GOAL17-check-harness's "two replies at once" is therefore two replies by the
main agent; its casting of an executor for that check carries a note. The check's point (two writers and a head that sends) is the same.

**D. The main agent's configuration operations record a proposal.** `policy.save`, `policy.sync`, `account.list`, `settings.save` and `prompts.save`
gain `itsMain` in `allowed`, and a call by the main agent records a Proposal instead of applying, as the brief says and `superagent.update` already
does. Slice 9 adds it. Issue #705 (a Snag in the Goal 17 milestone) keeps it from being lost; `44` is red until then.

**E. The `account.list` step runs on an account that is seen, not listed.** `a-main-agents-configuration-change…` starts from `an-account-was-seen`, so an
`account.list` applied instead of recorded would show.

**F. The check that nothing is left reads only this run's own folders.** The Mac is shared, and another session's orphans carry the same temporary
prefix. Every copy the checks make is recorded in a file named for the test runner's pid (`agents-support.ts`, `registerRoot`), and `48` judges the
folders and processes that name one of those and no others (a planted leftover of this run is found, and a planted one of another run is not).

## How the fairness proofs judge (the review's first block)

The tape runner (`e2e/superagent/tape/`) no longer compares anything itself. It builds prove's `CallRecord` from the tape (the answer as the body, the
journal as the entries the call's trace wrote) and runs prove's own `runChecks` (`packages/prove/src/modules/journeys/internal/checks.ts`). So `emits`
reads the first journal entry of its name and subset-matches it; `expect(...).toBe` compares as prove does, values as they travel (bigints as text,
keys in order, `undefined` read as `null` in a list). `packages/prove` does not export `runChecks`, and a framework change for a check's sake is not
made: the runner imports it by its internal path, in this check only. If prove moves the file, `40` fails at load and names it. No journal is derived from a check any
more: a step that asks for an event with no journal in the tape fails, and each tape's good journals are written out in `tapes/<name>.journal.ts`.

Running prove's own judge found: two `emits` of one event in one step both read the first entry (the full-pool journey, now split); an `undefined` in a
list equals `null` (the reap journey now reads a word, `"no refusal"`, for a missing outcome); and an object's key order is compared (the variables
journey now sorts by name before it builds one).

## Supersedes

- design/goals/17-superagent.md: "`reply` (main, executor, by purpose)" → "`reply` (main, by purpose; the executor speaks through `ticket.ack`)"
- design/decisions/GOAL17-check-harness.md: "the callers the brief allows ("main, executor, by purpose", `17-superagent.md:347`)" → "the main agent twice: `outgoing-message.reply` is the main agent's and the system's, and the executor speaks through `ticket.ack` (GOAL17-agents-checks, call C)"

## Evidence

- `packages/prove/src/modules/journeys/internal/checks.ts`: `runChecks` (`emits` takes `call.journal.find`; `show` compares `wireOf` strings).
- `examples/superagent/plugins/tickets/blueprint/things/outgoing-message/verbs/reply.ts` (`allowed: [itsMain.of("superagent"), Blueprint.system]`) and `ticket/verbs/ack.ts` (`itsAgent`).
- `examples/superagent/plugins/{intake,prompts}/…/verbs/{policy/save,policy/sync,account/list,prompt-set/save}.ts` and `blueprint/things/settings/verbs/save.ts` (`Blueprint.signedIn` only).
- PR #703's review; issue #705.

## Open risks

- The tapes are the author's reading of the records, not a world. They show each check can pass and cannot be passed hollow; slice 9 runs the same journeys for real and may find a step no system can pass.
- `runChecks` is imported by an internal path; a move in prove breaks `40`'s load, loudly.
