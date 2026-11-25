# The board, claims and the collision rule (K42)

Read this when you rank, claim, settle a collision or change a row. The rules are K42, sections 2, 3 and 5; the page
is `docs/canon/status.md`, section 2.

## A row

One row is one item: a piece of work with an id, a stage, an app that pulled it, a release, an app milestone, a lane,
the paths it touches, the ids it needs and its evidence. The page's own legend says what each column holds, including how
a row adopts an existing issue (`` `issue #N` `` in Evidence) and folds duplicates into it (`` `folds #N, #M` ``).

**The stages**, in the order work moves (K42, section 2):

1. **provisional:** an app's first pass listed it, or it is only designed. A decision with no code is provisional.
2. **spiked:** each unknown has a spike's answer in `spikes/`. An unknown only Aaron can settle is a grill.
3. **scaffoldable:** its things, events, operations and journeys are declared through the framework (`ortho add`,
   `ortho add journeys`, `ortho new adapter`), with the journeys red.
4. **building:** handlers until the journeys pass. Authors and builders keep their rules (the `author` skill).
5. **built:** green on `main` **and proved by the journeys of the app that pulled it**. A piece built before any app pulls
   it stays at building until an app's journeys prove it. Tests of its own package, `acme` or a fixture do not count.
6. **extracted:** moved from the app's `plugins/` into `packages/`. Extraction is what puts a piece into a framework
   release: the beta is every piece Capxul's books, HR and payroll pulled, extracted and published; 1.0 the same for
   the rest of Capxul core (K44).

**Pulled by** is the app that needs it first: Capxul, or framework (the alpha's, or no app yet; K45). **Release** is the framework
release it ships in. **Milestone** is the first app milestone that pulls it; a piece no app has pulled sits in "Not yet
needed", with no dates.

## Change a row in the pull request that changes the item

A goal that starts an item sets its lane; one that moves it up a stage changes the stage; one that finishes it sets built
(or extracted) and adds the pull request and the journey to Evidence. That is all: the `goals` workflow runs
`sync.mjs --board --project --apply` on every push to `main`, so the issue, its labels, its milestone, its state, the
Project's Stage, Status, Lane, Start and End follow. A row the sync cannot read stops the run (exit 2) before any write.

The Project's Status follows the row: **Done** when built or extracted; **Running** when it has a lane; **Ready** only
when every row in Needs is built; otherwise **Blocked**. Start and End are computed, never typed (see the `github`
skill): a milestone's due date is the forecast end of its last item.

## A claim

A claim is the **`lane:goal-<n>` label on the item's issue** plus the **row's Touches** (the paths its work changes). It
means "this goal is working this item and these paths now". Lanes are for live agents: a goal that stops releases its
claims. Every round, `sync.mjs --board --dry-run` prints any two goals' open claims that overlap on a path.

## The collision rule (K42, section 3)

An app goal owns every gap it finds, big or small. Before it starts one, it reads the board's claims:

| Case | When | What happens |
|---|---|---|
| 1 | another running goal has claimed it, or it is in a slice a running goal has scheduled | wait for that piece, or take the part of it that has landed. A slice of a goal that has stopped is not scheduled: it is an item on the board, and the app goal that needs it takes it (case 3) |
| 2 | it would change paths another running goal has claimed | the two agree through the framework goal: one does it, or they split it. Goal 18 records the call as a decision and on the rows |
| 3 | neither | claim it (lane and Touches on its row) and build it in its own slice, on its own branch, to the design its owner recorded if there is one |

Some merge cost is accepted. It stays small because the lander moves each green slice into `main` soon after it lands on
its app branch.

**An Ask issue exists only for case 2**, to hold the two claims until Goal 18 settles them. Every other gap is a claim on
a row, not a request to another goal. Case-2 asks stay open until settled; once settled, the row that results adopts the
issue (`` `issue #N` ``), so the board holds one page for it.

## The two builds on the board (K45)

K44 (25 November 2026) parked the superagent, so Capxul is the one app building. K45 re-sorted the rows it pulled:
sign-in, principals, `ortho add` and the chain basics to the alpha (milestone `alpha`, release preview); secrets,
events in, webhook doors and adapters from a spec to Capxul's banking; timers to its payroll; derived reads and roles
to its books; the rest to "Not yet needed". The parked goals' open issues carry `parked`, which the sync sets and the
Project's views leave out. Before K44, the split was this.

The apps split the shared pieces (Aaron's call 9). A piece both need goes to the app that needs it first in the order the
apps run, and the superagent runs first, so it takes most of them: versions, timers, safe repeats, events in and the
outbox, secrets, webhook doors, the pages, sign-in and the live deploy. Capxul takes the reports, richer lists, trees,
dates and the other books pieces only it needs; the other app mounts a piece once it is extracted. Organisations are not
shared: the superagent's teams and Capxul's companies are two rows. Goal 18 keeps the split on the board and settles any
piece both want.

## Grills

A grill is an unknown only Aaron can settle. Open it as a **Decision issue labelled `needs-aaron`** (filter the Project or the issue list by the label). Batch them. Bring each to Aaron by voice, as the `threads` skill says in "Talking to Aaron", with
the code in front of him first (his global rule): the problem in code, what it touches, each option as code, graded. Record
the answer in `design/decisions/<id>.md` and send it to every running goal; close the issue with the pull request that
writes the file.
