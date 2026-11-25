# K45: the board follows the two builds, the parked goals' issues are hidden, and the climb has dimensions

**Decided 25 November 2026** with Aaron, by voice, after K44 merged (#1053). It does K44's board work, Goal 18's slice
4, and adds a dashboard of the climb as slice 13.

## The problem

Read on 25 November 2026 from `main` (6690861b) and GitHub:

- **The board was still cut for K42.** 318 issues were open, and 162 of them belonged to parked goals (Goal 3's 35,
  Goal 17's 30, Goal 9's 18 and the rest). Of the board's 117 rows, 30 were pulled by the parked superagent under its
  milestones, and every Capxul row said 1.0, though K44 put the books, HR and payroll in the beta.
- **Nothing showed the climb.** A row counts as built only once the journeys of the app that pulled it prove it, so 12
  of 117 rows were built and Capxul's showed none, though most of its HR is built. A chart of rows alone would sit flat.
- **Another project shows the climb well.** The Durable Teams build dashboard (a claude.ai data page) holds every eval
  in its build plan and one row per scoring run; it shows the evals passing out of all of them, a bar per milestone
  (passing, failing, not written yet), and a line of passing evals over time that only climbs, under a dashed line of
  all evals.

## Aaron's calls

Heard through speech to text and kept as heard.

1. **Re-cut the board for the main line, and climb like Durable Teams.** "How should we update this such that we're
   following the main line now? ... How can we re-cut and re-plan this? ... it created a beautiful dashboard that really
   like burned down ... it was like basically a hill climb sort of thing. How can we do that for this now?"
2. **Hide the parked goals' issues, don't close them.** Asked whether to hide or close them: "I agree you should hide
   those".
3. **Climb the capabilities too, on more than one dimension.** "You should also think about the capabilities as well
   that we still do want a hill climb them though don't we can't this be multidimensional".

## The decision

### 1. The milestones are the two builds'

`tools/github/board.mjs` ranks them in this order: **alpha** (`Alpha: Orthograph on npm`, the framework's, Goal 18),
then Capxul's path, **books**, **people and payroll**, **banking**, **budgets** (new) and **getting paid** (later, with
the chain). The superagent's four stay defined for when it resumes; no row uses them, and the sync clears their old
forecast dates. A framework row's only milestone is the alpha. Each milestone names its release and the goal that
builds it (`board.mjs`), so the views and the release rule read one table.

### 2. The release follows the milestone (K44, section 4)

The alpha's rows ship in the preview, and every preview row is the alpha's. Capxul's books and people and payroll ship
in the beta; banking, budgets and getting paid in 1.0; a piece Capxul pulls off its path in 1.0. A row with a milestone
names its release. `board.mjs` refuses any other pairing.

### 3. The rows, re-sorted

- **To the alpha:** every preview row but the portal's graphs and its UI package (portal screens wait, K44 call 2; the
  portal viewer and monitor stay, for their server and feed only); the chain basics (keys, the chain adapter,
  confirmation depth, the relayer and follower); sign-in and principals (the starter's #446 and #449); `ortho add`; and
  `ortho new`, rewritten as K44's `ortho new app`, which makes the app the preset makes and needs only the preview's
  packaging. M2.09's Plugged In scaffold, which needs teams, waits with them. A new row, getting started.
- **To Capxul:** secrets, events in, webhook doors and adapters from a spec to banking (Bridge's webhooks and adapter);
  timers to people and payroll (a scheduled pay run); derived reads, roles declared with `who` and `holds`, and richer
  lists to the books; a new row, budgets, to budgets; the Safe and Hats to getting paid; incorporation help off the path.
  Capxul's books and people and payroll rows move to the beta.
- **To "Not yet needed":** the rest of the superagent's (the agents, the sandbox, its features and extraction, versions,
  safe repeats, the outbox, the pages and the UI pieces, approvals, teams and the live deploy), the portal's graphs and
  its UI package.

Organisations stay separate (K42, call 10): Capxul's companies are its books', and teams wait.

Two rows of Capxul's later path need rows nobody needs yet: getting paid needs the pages (and through them the UI
pieces), and the ERC-20 adapter needs adapters from an ABI. That holds while getting paid is later, with the chain; when
Capxul reaches it, those rows move to its path.

### 4. A parked goal's own plan carries `parked`

The goals sync labels `parked` a parked goal's own open goal issue and slices, in its own milestone, unless a running
goal shares one (its goal label) or claims it (its lane); it takes the label off when the goal resumes. Nothing is
closed. A parked goal's snags, asks and decisions stay in view: some are the alpha's now (the starter's #446 and #449,
the preview's #688, the relayer's #700), and Goal 18 sorts the rest. The Project's views (`tools/github/project.mjs`)
are "All goals", "By status" and "Roadmap" without the parked issues; "The alpha" (its milestone and Goal 18's);
"Capxul's path" (its milestones and Goal 16's); "Parked" (open ones); and one per running goal. The sync never deletes a
view, so a parked goal's old view stays until someone deletes it in the Project.

### 5. The climb, on dimensions (Goal 18's slice 13)

Two lanes, the alpha and Capxul, each climbing on three dimensions, worked out day by day from `main`'s history and
GitHub:

- **Capabilities:** the board's rows in the lane, by stage, from `docs/canon/status.md` in git: a stacked band per stage
  that rises as rows move from provisional to built, and a line of weighted progress (`roadmap.mjs`'s `STAGE_SHARE`).
- **Tests:** passing, failing and planned but not written. The alpha's come from its e2e suites, each file's tests less
  its `expected-failing/` lines, so the line only climbs (the ratchet). Capxul's journeys climb the same way once Goal
  16's slice 13 runs them in CI with a list of the ones still red; until then its written journeys are counted, and the
  record types its path still needs are the planned ones.
- **Slices:** each goal's slices closed out of its slices, from the slice issues.

A script in `tools/github/` writes the dimensions as JSON, and a claude.ai dashboard draws them, refreshed nightly.

## What was not chosen

- **Parking every issue of a parked goal.** A first draft did, and it hid the starter's sign-in bugs, which are the
  alpha's first fixes (Goal 18's slice 10), with twenty other snags. A goal's plan is what parks; its snags are work.

- **Closing the parked goals' issues** (call 2). Closing is tidier on GitHub's issue list, but a goal that resumes would
  reopen them one by one; a label hides them from every view and comes off by itself.
- **One measure for the climb.** Rows alone sit flat while a build's tests climb, and tests alone miss a capability
  nobody has written a test for yet (call 3).
- **A new pulled-by value for the alpha.** The alpha is the framework's own release, not an app; its milestone says so.

## Supersedes

- `docs/canon/status.md`: "the app that needs it first: **superagent**, **Capxul**, or **framework**" → "the app that needs it first: **Capxul**, or **framework**"
- `docs/canon/status.md`: "Goal 18's slice 4 changes the rule and the rows together" → "`tools/github/board.mjs` enforces it, K45"
- `docs/canon/status.md`: "Capxul's: `getting paid`, `books`, `people and payroll`, `banking`" → "`alpha`; then Capxul's path, `books`, `people and payroll`, `banking`, `budgets` and `getting paid`"
- `docs/canon/status.md`: "Goal 18's slice 4 re-sorts the rows" → "K45 re-sorted the rows the superagent pulled"
- `.agents/skills/conductor/references/board.md`: "Goal 18's slice 4 re-sorts the rows" → "K45 re-sorted the rows it pulled"
- `.agents/skills/conductor/references/board.md`: "superagent, Capxul, or framework (no app yet)" → "Capxul, or framework (the alpha's, or no app yet; K45)"
- `.agents/skills/github/SKILL.md`: "**Milestones are the apps'**" → "**Milestones are the two builds'**"
- `.agents/skills/github/SKILL.md`: "and one per goal (K42's by-app, by-lane and grills views are not made yet; filter by field)" → "\"The alpha\", \"Capxul's path\", \"Parked\", and one per running goal"
- `.agents/skills/github/references/sync.md`: "(Goal 18's slice 4 changes the ranking for K44)" → "in `board.mjs`'s order: the alpha's first, then Capxul's path (K45)"
- `tools/github/board.mjs`: "Goal 18's slice 4 changes this rule with the board's rows" → "a row ships in its milestone's release"
- `tools/github/roadmap.mjs`: "the superagent's first, then Capxul's, as K42 ranked them" → "board.mjs's order: the alpha, then Capxul's path, K44"
- `tools/github/project.mjs`: "every goal in one table, a board by Status, a roadmap (Start to End), and one table per goal." → "every running goal's work in one table, a board by Status and a roadmap, all without the parked goals' issues"

## What else it touches

- **The board:** `docs/canon/status.md`'s rows and column legend; on merge the board sync moves the re-sorted rows'
  issues to their milestones and relabels their releases, and makes the `Alpha: Orthograph on npm` and `Capxul: budgets`
  milestones.
- **The goals sync:** the `parked` label on about 125 open goal and slice issues on its first run.
- **The Project:** its views change on the next `--project` run, which needs the Project token: a local run on Aaron's
  machine, or the workflow once the `ORTHOGRAPH_PROJECT_TOKEN` secret exists.
- **Goal 18's brief:** slice 4 is this; slice 13, the climb, is new.
- **The skills:** the `github` skill's milestones, labels and views; the `conductor` skill's board reference.
