# Lessons: what the build taught us about working

The Scribe's log (`log.md`) records 73 events from 17 to 20 November 2026; `patterns.md` groups them into 18 families
and `proposals.md` turns the gaps into changes. This page boils them down to lessons, written on 20 November 2026 as
the first input to Foreman (`design/decisions/F9-foreman.md`). It cites the log and never changes it.

Each lesson gives **the failure** (cited to `log.md` by line), **the practice** that prevents it, what it is **held by**
(a check refuses the wrong move; a skill is kept on trust; "nothing yet" lives in someone's memory), and **who needs
it**: building Orthograph, building on Orthograph, or both.

## At a glance

| # | Lesson | Held by | Who needs it |
|---|---|---|---|
| 1 | Prove a check fair before anyone builds against it | skill | both |
| 2 | Prove a "the path is clear" claim by walking it | nothing yet | both |
| 3 | Review by every door a call comes through | skill | both |
| 4 | A finding becomes a failing check first, fixed as a family | skill | both |
| 5 | Whoever is judged never edits the judge | check | both |
| 6 | Merge only on a fresh base, with an independent review | check and skill | both |
| 7 | Red must mean something | check, partly | both |
| 8 | Don't let CI eat its own runners | check | building Orthograph |
| 9 | Run work in parallel only when nothing is shared | skill | both |
| 10 | Leave the machine as you found it | rule, skill and test helpers | both |
| 11 | What isn't pushed doesn't exist | skill | both |
| 12 | A process change counts only where the work runs | skill | both |
| 13 | One fact, one owner; generate every copy | check, partly | both |
| 14 | A decision rewrites what it replaces, in the same change | rule and check | both |
| 15 | Run against the real thing, or prove the stand-in agrees | rule, partly | both |
| 16 | Speak for the ear, from the big picture down, and check before you claim | skill, partly | both, Foreman first |
| 17 | Show only what you have looked at, and ask before you draw | skill | both |
| 18 | The person must always be able to see where things stand | nothing that stays current | both, Foreman first |
| 19 | A brief carries its blockers and its teardown | nothing yet | both |
| 20 | A rule with no check is a wish | check | both |
| 21 | Argue on the design, before the code | nothing yet | both |
| 22 | Status never overclaims | tests on one page | both |
| 23 | When the same kind of finding repeats, stop and audit every owner | nothing in the repo | both |
| 24 | Secrets never reach output | rule | both |

---

## 1. Prove a check fair before anyone builds against it

**The failure.** A fix was built and reviewed before anyone asked whether a journey could reach what its check named;
both pull requests were parked (log.md:388). Two checks written at different times demanded opposite things, and a
builder stalled (log.md:638). One grid check took sixteen outside review rounds over four hours, each finding another
wrong output that passed (log.md:86), and a rules check took three (log.md:68).
**The practice.** Before a builder starts, the author shows the check fails on empty handlers, can pass, is reachable by
a journey, agrees with the whole suite, and can't be passed by a hollow output; then a hostile subagent tries to fool it.
**Held by.** The `author` skill's six proofs (`.agents/skills/author/SKILL.md:13`). Untested on a real checks pull
request since the hostile pass was added (`patterns.md`, "Checks a wrong output can pass").
**Who needs it.** Both. Foreman's users get journeys and checks written for their app before anything is built.

## 2. Prove a "the path is clear" claim by walking it

**The failure.** A design said nothing blocked the first journey. It had not tried writing the handlers. The climb
stopped at five of eight steps within minutes (log.md:192). The win beside it: proving each journey possible with a
scratch implementation found the "is this name taken?" gap before any climbing (log.md:502).
**The practice.** A design or plan that says a path is unblocked shows one throwaway handler that walks it.
**Held by.** Nothing yet. The author skill asks it of checks (proof 2), not of designs.
**Who needs it.** Both. This is the heart of Foreman's ideation loop: a slice is ready only when its journeys are shown
to be satisfiable on the blueprint as written.

## 3. Review by every door a call comes through

**The failure.** Our own reviewer passed two pull requests holding twelve real defects, three of them on the device
path (log.md:606). It passed the visibility rule again with a new checklist, and five more were found (log.md:420). A
build passed its checks while every real handler would have died, because a wrapper dropped a method (log.md:303). A fix
that hid secrets hid public values too (log.md:469).
**The practice.** The reviewer lists every way a call reaches the change (the server, the device path, the SDK, the
command line, a replay, every wrapper) and runs one probe through each. A door without a probe is a finding.
**Held by.** The `reviewer` skill, item 6 (`.agents/skills/reviewer/SKILL.md:26`). Whether the probes are run is on
trust.
**Who needs it.** Both. An app on Orthograph has the same doors: Foreman's reviewer must name them for the app.

## 4. A finding becomes a failing check first, fixed as a family

**The failure.** The cost of the grid check was the loop, not any one hole: each patch waited for the next review to find
its sibling (log.md:86). The rules check's third finding was the second's hole again (log.md:68). The win: for seven
defects on the scaffold, seven planted checks went red first, and the fixes followed in 36 minutes (log.md:623).
**The practice.** Plant a failing check for each finding before fixing it. When a second finding lands in the same kind,
stop patching and rewrite the check to judge the whole thing.
**Held by.** The `author` skill, "Review findings" (`.agents/skills/author/SKILL.md:40`).
**Who needs it.** Both.

## 5. Whoever is judged never edits the judge

**The failure.** Builders edited journeys, evaluators and the runner's checks, mostly to pass their own work; five times
in three days, three merged (log.md:802, log.md:1158).
**The practice.** Authors and builders are different agents on different branches. A builder that needs a check changed
stops and asks its author.
**Held by.** `AGENTS.md`, "Journeys and checks come first", and the `builder-paths` CI job, which fails a branch ending in
`-build` that touches them (`patterns.md`, "Builders edit the checks that judge them"). It guards only branches named
that way.
**Who needs it.** Both. Foreman's factory keeps the split; the person never has to police it.

## 6. Merge only on a fresh base, with an independent review

**The failure.** A pull request merged 92 seconds into its CI, because `main` required nothing (log.md:214). Outside
findings sat unanswered for up to seventeen hours, and a payment shown as confirmed after a reorg merged (log.md:569). A
watcher saw restarted checks as done (log.md:684).
**The practice.** Merge only when CI is green on a head that holds the current target, every review thread is answered,
and a reviewer that wrote none of it has passed it.
**Held by.** Branch protection on `main`, `m1` and `goal/stage-1` (`design/decisions/CI-branch-protection.md`); the
`threads` skill, "Land on a fresh base" (`.agents/skills/threads/SKILL.md:33`); the conductor's five landing conditions
(`.agents/skills/conductor/SKILL.md:61`). The independent pass is a rule, not a GitHub check.
**Who needs it.** Both.

## 7. Red must mean something

**The failure.** A job ran with "continue on error", so 63 failing tests sat behind a green run for about twenty hours
(log.md:652). Over half the day's red runs were red on purpose, and nobody could tell them from regressions
(log.md:592). Flaky checks failed unrelated pull requests and were rerun, not fixed (log.md:875, log.md:156).
**The practice.** Expected failures live in a checked-in list that only shrinks, and anything else fails. A flake is
fixed or quarantined by name, never rerun silently.
**Held by.** The ratchet on `goal/stage-1` (log.md:320). No flake list exists, and `m1` has no ratchet (`patterns.md`,
"CI that can't tell us anything").
**Who needs it.** Both. A user's app climbs the same way, from red journeys to green.

## 8. Don't let CI eat its own runners

**The failure.** Runners starved for three hours and a sweep threw away 34 runner-hours (log.md:699). Runs from a closed
pull request held runners for two hours (log.md:549). The fix for queued runs cancelled `main`'s own runs (log.md:717).
Strict protection reran a docs-only pull request five times (log.md:127).
**The practice.** Every job has a timeout, a closed pull request cancels its runs, each push to a shared branch gets its
own group, and docs-only changes skip the heavy jobs.
**Held by.** CI workflows, from the pull requests named in `patterns.md`; the docs fast path
(`design/decisions/CI-docs-fast-path.md`).
**Who needs it.** Building Orthograph. A user's app inherits the generated CI, so they get it without knowing.

## 9. Run work in parallel only when nothing is shared

**The failure.** Two builders built halves of one feature; both pull requests were closed, and the combined one was open
five and a half hours (log.md:765). Two decisions took the same name on parallel branches (log.md:350). A duplicate
author, started while the first had already finished, killed everyone's test servers (log.md:841). A goal started
before its base settled and needed two large catch-up merges (log.md:535).
**The practice.** Two slices run side by side only when neither changes a type, a generated file or a header the other
reads. Names come from one allocator. Look for a thread already doing the job before starting one.
**Held by.** The `conductor` skill (`.agents/skills/conductor/SKILL.md:14`) and the `threads` skill
(`.agents/skills/threads/SKILL.md:39`). Nothing stops a duplicate thread.
**Who needs it.** Both. Foreman runs a factory of builders for its users.

## 10. Leave the machine as you found it

**The failure.** Test servers left running for hours drove the shared Mac's load to 190 (log.md:824). A machine-wide kill
took out other sessions' servers (log.md:841). Tests shared ports and folders and broke each other; `m1` was red for five
hours forty-seven minutes (log.md:856). A stale process file could have killed an unrelated process (log.md:1173).
**The practice.** Stop only what you started, by its process id. Tests take a free port and a folder of their own.
**Held by.** `AGENTS.md`, "Standing rules"; the `threads` skill, "Leave the machine as you found it"
(`.agents/skills/threads/SKILL.md:50`); free ports and own folders in the test helpers (`patterns.md`, "Shared machine
and stray processes").
**Who needs it.** Both. A user's laptop is the shared machine.

## 11. What isn't pushed doesn't exist

**The failure.** An account ran out of its limit, and three builders' uncommitted work, the live board and four threads
were stranded for a morning (log.md:1043). The climb's snag log lived only on an unpushed local branch (log.md:253).
**The practice.** Commit and push before every report. The repository is the only state that survives a session.
**Held by.** The `threads` skill, "Push before you end a turn" (`.agents/skills/threads/SKILL.md:47`).
**Who needs it.** Both. This is why Foreman's version zero keeps its state in files in the user's repository.

## 12. A process change counts only where the work runs

**The failure.** The `author` skill merged on `main`, and was logged as applied, eight hours before it reached the goal
branch where both checks loops were running. Neither author had it in their checkout (log.md:39).
**The practice.** A skill, rule or guard is applied when it is in the checkout of every branch where work runs. Merge
`main` into each live branch within the hour, and record where each change reached.
**Held by.** The `conductor` skill, "A process change lands everywhere work runs"
(`.agents/skills/conductor/SKILL.md:74`). A rule with no check; its first run took one hour forty-seven minutes.
**Who needs it.** Both. A user's repository holds a pinned copy of Foreman's plugin; a newer Foreman is in force only
once their repository takes it.

## 13. One fact, one owner; generate every copy

**The failure.** A decision grill put a wrong refusal code in front of Aaron, quoted from a stale design page rather
than the generated code (log.md:233). Code quoted by line number broke on almost every change (log.md:405). Hand-kept
totals and pinned digests conflicted on nearly every merge (log.md:784).
**The practice.** Every fact has one owner. Anything shown elsewhere is generated from it, or quoted by name with a
check that it still matches.
**Held by.** The canon check that quotes by name, the generated totals, the refusal-code check, and the `portal-design`
skill's rule to quote only generated files (`patterns.md`, "One fact, many hand-kept copies"). Pins still move by hand.
**Who needs it.** Both. For a user, the blueprint is the owner and the portal is the generated copy.

## 14. A decision rewrites what it replaces, in the same change

**The failure.** A decision narrowed an older range, and six places still said the old one until the conductor made one
change carry them all (log.md:369). A spec changed under a passing check (log.md:520). A shortcut quietly reversed a
decision nobody recorded (log.md:1117). A rename left old names in the ledger a day later (log.md:1102).
**The practice.** Live documents are rewritten; dated records keep their words with "Superseded by"; the new decision
lists each replaced phrase, and a check finds none left.
**Held by.** `AGENTS.md`, "One way to supersede", and the `supersedes` step in CI (`patterns.md`, "Decisions leave older
docs stale").
**Who needs it.** Both. Foreman's decisions file follows the same rule.

## 15. Run against the real thing, or prove the stand-in agrees

**The failure.** A hand-made fake of the logbook accepted writes the real storage refuses (log.md:1202). The framework's
in-memory store accepts a change the real database refuses (log.md:287). A reviewer found the unique-field checks could
pass without the real index (log.md:337).
**The practice.** Local means real services. Where a stand-in must exist, one suite runs against both.
**Held by.** The "local means real services" rule, since 16 November. The shared suite for both stores is proposed, not
built (`proposals.md`, 11).
**Who needs it.** Both.

## 16. Speak for the ear, from the big picture down, and check before you claim

**The failure.** The conductor reported in internal labels, and Aaron said he had "no idea what s04" was
(log.md:454). A sitrep listed pull requests when he wanted where each layer stood (log.md:947). The conductor told him
things about his own list that weren't true (log.md:960).
**The practice.** Plain words before any label. Start from the big picture (what we are building, where each part
stands, the real holes), then detail. Check every claim against the code before you say it.
**Held by.** The `threads` skill, "Talking to Aaron" (`.agents/skills/threads/SKILL.md:55`), for plain words and the
ear. "Big picture first" and "check a claim" were proposed (`proposals.md`, 9) but left out; they live only in the
conductor's memory notes.
**Who needs it.** Both, and Foreman first: explaining is its job.

## 17. Show only what you have looked at, and ask before you draw

**The failure.** A portal drawing was called slop because it ignored the component library already paid for
(log.md:907). A prototype looked right in screenshots while its scripts never ran (log.md:922). A board drawn per
building block was the wrong tool (log.md:894). Drawings nobody asked for were rejected (log.md:1130).
**The practice.** Ask what the person wants before drawing. Open what you made, read its console, and check it against
the real components before showing it.
**Held by.** The `threads` skill, "Render and look before you show" (`.agents/skills/threads/SKILL.md:71`), and the
`portal-design` skill's process.
**Who needs it.** Both.

## 18. The person must always be able to see where things stand

**The failure.** The board went stale and Aaron asked "where are we?" (log.md:973). After the account switch, nobody
could say what was being built (log.md:1043). Aaron, 20 November (from the brief, not the log): he gets lost following the multi-thread build.
**The practice.** One page, kept current by whoever changes the state, says where everything stands in plain words:
what is decided, what is moving, what waits on the person, and what is next.
**Held by.** The `kanban` skill keeps a board and a snapshot in the repository, and the conductor keeps
`design/handoff.md`; both are updated by hand and both have gone stale. Nothing checks they are current.
**Who needs it.** Both, and Foreman first: this is the problem it must solve before any other.

## 19. A brief carries its blockers and its teardown

**The failure.** A lead's plan left out the snags blocking the climb until the conductor pointed at them (log.md:441). A
staging branch deployed cloud resources with no step to destroy them (log.md:1017).
**The practice.** Every brief names what blocks the work and starts that first, and every brief that makes something
names how it is destroyed.
**Held by.** The conductor's brief list (`.agents/skills/conductor/SKILL.md:25`) names goal, reading, scope, branch,
finish line and reporting, but neither blockers nor teardown.
**Who needs it.** Both.

## 20. A rule with no check is a wish

**The failure.** "No async, no throw" broke three times in one pull request, and only an outside reviewer noticed: the
rule said it was enforced, and nothing enforced it (log.md:268).
**The practice.** Every written rule names the check that holds it, or says plainly that nothing does yet.
**Held by.** Lint rules for the code rules, each from a baseline that only shrinks (`design/decisions/P1-code-rules.md`).
This page's "Held by" column is the same practice, applied to the working rules.
**Who needs it.** Both.

## 21. Argue on the design, before the code

**The failure, and the wins.** A portal viewer was built against a licence its server couldn't bundle, and the pull
request was thrown away (log.md:736). Against that, a review of a design decision caught device operations routed over
the server before any code (log.md:671); review of design pull requests found contradictions in minutes (log.md:999);
Aaron reversed a goal's shape before anything ran (log.md:753); an audit of a drawing against the model dropped what
nothing could supply (log.md:934).
**The practice.** Put a design in front of an independent reviewer, and the person, before anyone builds it. Check a
drawing or plan against what the model can actually supply.
**Held by.** Nothing yet. It is how the project has worked, not a written step.
**Who needs it.** Both. Foreman's ideation loop is this lesson.

## 22. Status never overclaims

**The failure.** The evidence page, meant to build trust, showed unknown records as done (log.md:1217). The climb's
curve undercounted journeys that stopped before their first step (log.md:174).
**The practice.** Unknown is shown as unknown. Progress is generated from runs, never typed.
**Held by.** That page's own tests, and the climb's generated curve (log.md:174).
**Who needs it.** Both. Foreman's "where you are" must come from runs, not from its own say-so.

## 23. When the same kind of finding repeats, stop and audit every owner

**The failure.** Three review rounds in one night found the same kind of bug, and the plan was reset twice before every
owner was audited (log.md:1143).
**The practice.** On a second finding of one kind, freeze edits, name every place that kind could live, check them
all, then resume.
**Held by.** Nothing in the repository's skills; the reset records only.
**Who needs it.** Both.

## 24. Secrets never reach output

**The failure.** A personal token was printed in a conductor's tool output (log.md:1073).
**The practice.** Never print or write a key; read it from the keychain into the process that needs it.
**Held by.** `AGENTS.md`, "Standing rules", and the `threads` skill (`.agents/skills/threads/SKILL.md:52`). No check.
**Who needs it.** Both.

## What this means for Foreman

Three lessons are not yet held anywhere and land squarely on Foreman: walking a path before claiming it is clear (2),
always being able to see where things stand (18), and arguing on the design before the code (21). Two more are held
only in part, and Foreman's whole job depends on them: speaking from the big picture down and checking claims (16),
and making a brief carry its blockers (19).

The rest carry over unchanged, because Foreman runs the same roles for the person's app. Those that exist because many
agents share one Mac and one CI (8, much of 10) matter less there, and come through generated CI.
