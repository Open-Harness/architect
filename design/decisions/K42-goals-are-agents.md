# K42: a goal is a long-running agent, apps lead, and the framework goal always runs

**Decided 23 November 2026** with Aaron, by voice, in a Claude Code session: he heard it back as a draft (#694) and
said go. The live docs listed under "Supersedes" are rewritten in the same pull request, as `AGENTS.md`, "One way to
supersede", asks. Capxul's own shape is K43, decided in the same conversation.

## The problem

Read on 23 November 2026 at about 09:45 UTC, from GitHub and the goal branches:

- **Too many goals for the agents running them.** There are 17 goals and 15 `goal/*` branches. Several are parked or
  never started (8, 10, 13, 14), but their branches and pull requests stay open. 22 pull requests are open.
- **Goals cut by area make every app need cross goals.** 33 Ask issues are open, most of them one goal asking another
  to land a slice early (K38). Goal 16's first Capxul feature waited on five pieces from five other goals
  (`M7-capxul.md`, section 4, on #487). Goal 17 filed seven asks for K40's fixes (#531 to #536, #538).
- **One goal grew into the framework.** Goal 3 owns the engine, all of M1 and M2, stage 1, staging and the npm preview:
  21 slices (#627 to #647).
- **The board doesn't match the code.** Of 135 slice issues, 11 are closed. Some of the open ones have already landed
  (Goal 3's slices 1, 2 and 6). A goal's lead is a thread managing threads, with less reach into the data than a person,
  and nothing writes the board for it.

## Aaron's calls

Heard through speech to text and kept as heard; "Capsule" is Capxul.

1. **A goal is a long-running agent.** "When I'm talking about a goal, what I'm meaning is an agent, a long-running
   agent ... typically today it's just a long-running thread inside Claude or Codex that's managing other threads".
   And later: "Ultimately, the goal should be all of this should run on a super agent."
2. **Build from applications.** "We should be building it from the perspective of building actual applications,
   because that's the only way we're going to really know ... the unknown unknowns." Capxul is the north star: "we
   really need to rebuild Capsule. That's the ultimate goal here".
3. **Provisional, then spiked, then scaffoldable.** "They should be provisional ... you need to spike them first ...
   then you should have enough information such that the blueprint, the events, you know, all of the things that you
   need are scaffoldable". "We need to be working with the framework."
4. **The framework is a lane that always runs.** "The framework itself is a special lane. That is a lane that should
   just always be running ... what is parallelizable now? But also, out of the things that can run right now, what is
   the highest priority things that need to run? ... It needs to be a bit more holistic."
5. **Own as much as possible; collision, not size, decides.** "If it's on the roadmap or it's in another slice ...
   it's going to touch something else ... it waits ... But if not, then it should just do it in its own slice ... as
   much parallelizability as possible, right? Even if there's a little bit of merge".
6. **Lanes are for live agents.** "Each orchestra or Manager kinda has its own lane but I think that those should be
   for active long-running agents."
7. **1.0 is Capxul core.** Asked "Is 1.0 'Capxul core runs on Orthograph'?", he answered: "And yes".
8. **Releases are what the apps can do; plugins come when an app needs them.** Hearing that the beta was still a list
   of framework plugins: "Why are the plugins still on that line? The plugins should be as and when they're needed,
   right? Whatever application is first and needs it, it builds it ... some of this stuff ... it's important to do, but
   it's not the highest urgency thing ... the whole point of doing the projects first is that it's like a forcing
   function ... how do we know that plugins work? ... We're supposed to be building it all like that."
9. **Split the shared pieces; the superagent goes first.** "It's not a blanket rule, but what we should do is we
   should split the pieces up amongst them ... we want to get the super agent done first because it's gonna help build
   capsule."
10. **Organisations are separate.** Asked whether organisations belong to the superagent's launch or to Capxul's
    books: "they are both separate". Read here as: the superagent's teams and Capxul's companies are different
    things, each built in its own lane. That reading is the framework goal's, under Aaron's standing authority; his
    word overrides it.
11. **The releases are the framework's.** "The beta should be the actual framework not the apps. The apps dogfood the
    framework. This is the most important thing."
12. **A lane that lands work on `main`.** "All of this work should be carrying on in their own branches ... and then
    there should be another agent that is peeling this stuff off as a proper PR into master. So we can keep master
    fresh." Asked whether lanes rebase or merge `main` in, and whether the lander lands whole slices or peels pieces:
    "yes merge main in, whole slices, go ahead"

## The decision

### 1. Four goals

- **The framework goal (Goal 18)** always runs. It owns the engine and every package no app goal has claimed, the
  board, the roadmap and the releases. It takes over the 🎼 conductor's loop: it decides what runs next.
- **The lander (Goal 19)** always runs. It owns getting work into `main`: it lands each app goal's green slices there
  as reviewed pull requests, keeps `main` green, and tells the app goals what landed (section 8).
- **An app goal** builds one app end to end, and dogfoods the framework while it does. Today there are two: **the
  superagent** (Goal 17, K39), which goes first because it then helps build Capxul (Aaron's call 9), and **Capxul**
  (Goal 16, the north star, rewritten by K43). Plugged In stays as the example app every change keeps green; it has no
  goal unless one is started.
- **A goal exists while its agent runs.** When it stops, it rewrites "Where it stands", releases its claims, and its
  open items go back to the board. No branch sits parked waiting for its lead.

### 2. How a piece of work moves

Every item on the board is at one stage:

1. **Provisional.** An app's first pass lists what it needs. Capxul's is Goal 16's slice 6 (K43); the superagent's is K39 and
   K40.
2. **Spiked.** Each unknown has a spike's answer (`spikes/`, the `spike` skill). An unknown only Aaron can settle is a
   **grill**: a Decision issue labelled `needs-aaron`. His answer becomes a decision record, and the framework goal sends
   it to every running goal.
3. **Scaffoldable.** Its things, events, operations and journeys can be declared, and are, through the framework
   (`ortho add`, `ortho add journeys`, `ortho new adapter`), with the journeys red.
4. **Building.** Handlers until the journeys pass. Authors and builders keep their rules (`AGENTS.md`, the `author`
   skill).
5. **Built.** Green on `main`, and proved by the journeys of the app that pulled it. A piece built before any app
   pulls it stays at building until an app's journeys prove it.
6. **Extracted.** Moved from the app's `plugins/` into `packages/` once it works. K39's call 7 now applies to every
   app. Extraction is what puts a piece into a framework release (section 6).

### 3. The collision rule

An app goal owns every gap it finds, big or small. Before it starts one, it reads the board's claims:

1. **Another running goal has claimed it, or it is in a slice a running goal has scheduled.** Wait for that piece, or
   take the part of it that has landed. A slice of a goal that has stopped is not scheduled: it is an item on the
   board, and the app goal that needs it takes it (case 3).
2. **It would change paths another running goal has claimed.** Agree through the framework goal: one of them does it,
   or they split it.
3. **Neither.** Claim it and build it in its own slice, on its own branch, to the design its owner recorded if there
   is one.

**The two apps split the shared pieces** (Aaron's call 9). A piece both apps need goes to the app that needs it first
in the order the apps run, and the superagent runs first, so it takes most of them; the other app mounts the piece
once it is extracted. The framework goal records the split on the board and settles any piece both want. The split
on 23 November is in `docs/canon/status.md` once Goal 18's slice 2 writes it: the superagent takes versions, timers,
safe repeats, events in and the outbox, secrets, webhook doors, the pages, sign-in and the live deploy; Capxul takes
the reports, richer lists, trees, dates and the other books pieces only it needs. Organisations are not shared: the
superagent's teams and Capxul's companies are separate things, each built in its own lane (call 10).

Some merge cost is accepted. It stays small because the lander moves each green slice into `main` soon after it
lands on its app branch (section 8). A **claim** is the `lane:goal-<n>` label on the item's issue plus a
"Touches" line naming the paths. The framework goal checks claims for overlaps every round. An Ask issue stays only for
case 2.

### 4. The framework goal's loop

Each round:

1. Read the board: every item not yet built, with its stage, its needs and its claims.
2. **What can run now:** items whose needs have landed and that are unclaimed, or claimed by the framework goal.
3. **What runs first**, in this order:
   1. an app goal is waiting on it now;
   2. it is on the superagent's next slice, then on Capxul's next feature (call 9);
   3. it makes scaffolding better for every app (today: `ortho new` for an app, M2.09; `ortho add` for events,
      errors, roles and moves, M2.14 and M2.15; adapters from an ABI, #474);
   4. it keeps `main` green and CI fast;
   5. a piece no app has pulled yet, and only with capacity to spare.
4. Start workers from the top, as many as CI holds: 20 jobs at once on the free plan, and at most two ready pull
   requests per goal (CI-drafts).
5. Rebuild the board from the repository as the lander lands work. Tell every running goal what was decided.

### 5. The board

- **One Project, "Orthograph".** Its truth is the capability map in `docs/canon/status.md` (K41 merged `design/scope.md` into it), one row per item, giving its
  stage, the app that pulled it and its release. On every merge into `main`, the sync writes one issue per row and
  fills the Project from them. A goal changes a row in the same pull request that changes the item, so nobody has to
  remember to close an issue.
- **Fields:** Stage, Pulled by (Capxul, superagent or framework), Release, Lane (the claiming goal), and Kind
  (capability, gap, grill or snag).
- **Views:** the roadmap by milestone, the roadmap by goal, by app, now (by lane), and grills (`needs-aaron`).
- **GitHub milestones are the apps' milestones**, which drive the work (section 6). The superagent's: the coding
  agent end to end, the triage agent made from data, its extraction, and its launch. Capxul's: getting paid, the
  books, people and payroll, and banking. A framework piece takes the milestone of the first app milestone that pulls
  it. A piece no app has pulled sits in "Not yet needed", with no date. Each goal's milestone closes when its goal
  stops.
- **The release is a label**, as K33 has it: `release:preview`, `release:beta` or `release:1.0`, the framework
  release a piece ships in (section 6). A piece the superagent pulls for its slices 1 to 14 ships in the beta; one
  pulled only for the superagent's launch, or only by Capxul, ships in 1.0.
- **The roadmap is computed, never typed.** An item's Start is the day a goal claims it and its End the day it is
  built; the sync writes both. For an item not yet started, Goal 18 forecasts both every round from what needs what
  and the pace measured so far (196 pull requests merged from 21 to 23 November; GitHub search `is:pr is:merged merged:2026-11-21..2026-11-23`). A milestone's target date is the
  forecast end of its last item, so a slip shows where it comes from. Fixed one-day blocks were the other choice;
  they hide how the work really flows.

### 6. The releases

The releases are Orthograph's, never an app's (Aaron's call 11). The apps dogfood the framework: a piece is in a
release once an app has pulled it, proved it with its journeys, and it has been extracted into Orthograph's packages.
A piece still inside an app's `plugins/` is not part of the framework yet.

- **Preview** stays as K28 has it: the framework on npm under `next`, the baseline every app builds on.
- **Beta:** every framework piece the superagent pulled to work end to end, extracted into Orthograph's packages and
  published, with the superagent running on that published framework. The superagent's launch is not part of it.
- **1.0:** the same for every piece Capxul core pulled (the books, HR and payroll in ERPNext's shapes, and the paid
  services, as K43 sets out), plus the release slices (M7.01 to M7.04, M7.06 and M7.13). This is Aaron's call 7.

**The apps' milestones** drive the work and sit on the roadmap; none is a release.

- **The superagent:** the coding agent end to end (its slice 12), the triage agent made from data (13), its plugins
  extracted (14), then its launch. The launch is new: real sign-in, teams (who shares and owns an agent), a live
  deploy with a public address for webhooks, and a sandbox and a model endpoint off Aaron's Mac. Its lead adds it to
  the brief as slice 15.
- **Capxul:** getting paid (Goal 16, slice 2), the books, people and payroll, and banking (K43).

K28's beta, Gate M2 (other kinds of caller, sign-in and organisations as plugins, secrets, `ortho new`, the handles
plugin, the screens), is no longer a release. Each of those pieces takes the milestone of the first app milestone that
pulls it, and the rest wait in "Not yet needed". Plugged In's stages 2 to 4 (wallets, the vault, the club on Aztec)
leave 1.0's definition the same way.

Aaron did not say whether the beta needs the superagent launched; the call above, that it does not, is the framework
goal's under his standing authority, and his word overrides it.

### 7. Winding down today's goals

Each goal not named in section 1 finishes the pull request it has in review, rewrites "Where it stands", sets
`status: parked`, and stops. Its open slices become board items at their stage. The framework goal's slice 1 sees each
one through, and the lander lands what each has finished. The pull requests below were read at about 10:45 UTC.

| Goal | Lands first | Then |
|---|---|---|
| 3 · Stage 1 of Plugged In | #683, the npm preview's build (M1.51), and #690, secrets by declaration (M2.04) | `goal/stage-1` lands in `main` (the lander's slice 1) and is retired; `main` is the one integration branch |
| 4 · On chain | #679, the follower (Capxul's first feature needs it), and #677, the relayer | parked |
| 5 · The UI layer | nothing in review; slice 3 landed (#655) | parked |
| 6 · The new portal | #669, the frame, and #692, the parity ratchet's self-test (#584 landed the shell, the map language and the app projection) | parked; #693 stays a draft for its board item |
| 7 · Safe, Hats and budgets | #294, landed by the lander or closed by Goal 18 | done |
| 8 · Workflows | #472, the workflow decision | parked |
| 9 · Time | #696, timers across processes landed early for Goals 8 and 10 | parked |
| 10 · Agents | #469, where an agent run lives | parked; #490 stays a draft |
| 11 · Events | nothing in review | parked; #498 stays a draft |
| 12 · Wallets | #499, its parked state | parked; #497 stays a draft |
| 13 · The vault | not started | its slices become board items |
| 14 · The club | #504, the Aztec spike, into `main` for the record | parked |
| 15 · Release | nothing in review | its slices become Goal 18's items; the granted credentials stay recorded in `M7-release.md`, on `goal/release` |
| 16 · Capxul | #487, its map, with K43's superseded marks | restarts under K43's brief |
| 17 · The superagent | keeps running, as an app goal and first (#686 and #687 in review) | its base moves to `main` with the lander's slice 1 |

Goal 18 sorts each of the 33 open Ask issues: the asking app goal builds it (case 3), it stays open (case 2), or it
closes because it no longer applies.

### 8. The lander

All app work goes on in the app goals' own branches. The lander (Goal 19) brings it into `main`, so `main` stays fresh
and every release is cut from it (Aaron's call 12).

1. **Whole slices.** When an app goal's slice is green on its branch, the lander lands everything up to the commit
   that ends it, by K38's early landing: a branch cut at that commit, a pull request into `main`, reviewed by a 🔍 that
   wrote none of it, merged by a merge commit, never squashed. Nothing is copied twice, so nothing conflicts later.
2. **Peeled only at extraction.** Moving a plugin out of an app's `plugins/` into `packages/` is its own pull request
   on `main`, which the lander or the app goal opens; the app then mounts the package.
3. **Merge `main` in, never rebase.** After each landing the lander tells the running goals, and each merges `main`
   into its branch at its next slice start, as `AGENTS.md` already says: never by rebasing.
4. **It owns `main` being green.** A red `main` is the lander's first job, ahead of any landing.
5. **It keeps CI predictable.** The pull requests that bring app branches into `main` are its own, at most two in CI
   at once (CI-drafts).

## What was not chosen

- **A capability board worked by one or two standing framework goals**, proposed earlier in the same conversation.
  The board is kept. Planning framework work apart from the apps is dropped (Aaron's call 2).
- **Apps only, with no framework lane.** Nobody would own `main` and the shared engine (Aaron's call 4).
- **Merging the 17 goals into about four by area.** The asks between goals would stay.
- **Rebasing the app branches on `main`.** It rewrites history that open pull requests and reviews rest on, and
  needs force-pushes the branch protection refuses (call 12).
- **Peeling every framework change off as its own pull request.** The same change would then live on two branches
  and conflict when the app merges `main` back; peeling is kept for extraction (section 8).
- **Parking an app goal on any big gap.** Aaron: collision decides, not size (call 5).

## Open risks

- Two goals changing the engine at once will conflict, and the collision rule only catches what was claimed. Claims
  name paths, and fixes land in `main` small and early.
- The board needs the sync to read the status page's capability map (Goal 18, slice 2). Until then the Project still shows goals.
- Retiring `goal/stage-1` leaves `main` as the only branch where its protections (CI jobs, `builder-paths`, resolved
  threads) apply. The lander (Goal 19) checks that `main` already requires each of them in its slice 1, before it retires the branch.

## Supersedes

Each line is one phrase that sat on one line of a live doc; `tools/ci/supersedes.sh` checks none is left there.

- `AGENTS.md`: "starts until what it needs has landed, in any milestone order (K34), except on an integration branch" → "app goal builds what it needs in its own slice, unless a running goal has claimed it or its paths (K42)"
- `AGENTS.md`: "and Snag and Ask issues in that milestone" → "its claims on the board, and Snag issues (K42"
- `AGENTS.md`: "one long autonomous run with a bound and a single done check" → "A goal is one long-running agent, today a thread that manages other threads, later a superagent (K42)."
- `AGENTS.md`: "one commit per milestone slice" → "it works one commit per slice"
- `AGENTS.md`: "The milestone reaches `main` by one pull request" → "Its work reaches `main` by pull requests"
- `AGENTS.md`: "The goals and what each needs are in" → "The running goals and the collision rule are in"
- `AGENTS.md`: "by a branch cut at the commit that ends it and merged into `goal/stage-1`" → "by a branch cut at the commit that ends it and merged into `main` (into"
- `design/goals/map.md`: "It owns paths, and only its own." → "An app goal owns every gap it finds, big or small."
- `design/goals/08-workflows.md` to `15-release.md`: "A slice builds once what it needs has landed (K34" → "Under K42: a gap this goal finds goes by K42's collision rule (section 3)"
- `design/goals/08-workflows.md` to `15-release.md`: "is an Ask issue in the owning goal's milestone" → "Under K42, an Ask issue is only for two goals' claims that overlap"
- `design/goals/17-superagent.md`: "is announced to its owner as an Ask issue in the owner's milestone" → "is claimed on the board first"
- `design/goals/17-superagent.md`: "an exception to the map's rule 1" → "now every app goal's rule (K42)"
- `.agents/skills/kanban/STATE.md`: "**1.0:** the beta, then stages 2 to 4 and the release slices." → "**1.0:** the same for every piece Capxul core pulled (K43), and the release slices (K42)."
- `docs/canon/status.md`: "| **1.0** (stages 2 to 4) |" → "| **1.0** (Capxul core, K42) |"
- `docs/canon/status.md`: "the canon's one example, the app 1.0 is built as (K9)" → "the canon's one example (K9)"
- `docs/canon/status.md`: "and Capxul on Orthograph (M7.07 to M7.11)" → "and the real vendors, the builder's staging token and contracts on a testnet (M7.07 to M7.09); Capxul (M7.10, M7.11) proves 1.0 (K42, K43)"
- `design/milestones.md`: "Orthograph is the only focus until it is **workable, at the end of M2**" → "the framework is built by the apps that dogfood it"
- `design/milestones.md`: "A slice starts once what it `needs` has landed, in any" → "An app goal builds what it"
- `design/milestones.md`: "**After Gate M2 the order is by stage**" → "Goal 18 ranks what runs next"
- `design/milestones.md`: "then, after Gate M2, M7.01, M7.03," → "then, once an app pulls them, M7.01, M7.03,"
- `design/milestones.md`: "## The critical path to workable" → "## Plugged In's path to workable, as planned before K42"
- `design/milestones.md`: "**After workable (K9):** stage 2 (wallets) next" → "**After workable (K9), as planned before K42:** stage 2 (wallets) next"
- `design/milestones.md`: "first plugin, the wallet, is stage 2." → "the superagent goes first, then Capxul, starting with getting paid."
- `design/handoff.md`: "**Workable at the end of M2:** plugins mounted and proved" → "**The framework, built by the apps that dogfood it (K42):**"
- `design/handoff.md`: "Then M2.03 to M2.08, `npm create orthograph` (M2.09), Gate M2 (M2.12) and the staging run." → "The M2 slices wait until an app pulls them (K42, sections 6 and 7)."
- `docs/canon/README.md`: "in the four stages 1.0 is" → "in the four stages it is"
- `docs/canon/outline.md`: "the app 1.0 is built as" → "the app the canon is built around"
- `.agents/skills/kanban/STATE.md`: "**Beta** (stage 1, "workable"): Gate M2 and Goal 3's done check, staging included." → "**Beta:** the framework with every piece the superagent pulled, extracted and published, the superagent running on it (K42)."
- `docs/canon/status.md`: "| **Beta** (stage 1, "workable") |" → "| **Beta** (the framework the superagent proves, K42) |"
- `docs/canon/status.md`: "### Stage 1: workable (beta)" → "### Stage 1: workable (Plugged In's first stage)"
- `docs/canon/status.md`: "### App UI (beta for the screens, then 1.0)" → "### App UI (built as an app needs it)"
- `design/milestones.md`: "The **beta** is stage 1: Gate M2 (M2.12) and Goal 3's staging run." → "The **beta** is the framework with every piece the superagent pulled, extracted and published, the superagent running on it (K42)."
- `design/handoff.md`: "the beta (stage 1: Gate M2 plus the staging run)" → "the beta (the framework the superagent proves, K42)"
- `design/handoff.md`: "That is the beta (K28), the end of stage 1." → "Under K28 this was workable at the end of M2"
- `design/handoff.md`: "The beta (K28) is the critical path." → "The superagent's next slice is the critical path (K42)."
- `design/milestones.md`: "the beta plus stages 2 to 4 and the release" → "the same for every piece Capxul core pulled (K43), plus the release (K42)"
- `design/milestones.md`: "**v1.0** is the four stage gates on `main`, plus the release" → "**v1.0** is the framework with every piece Capxul core pulled, extracted and published (K42, K43), plus the release"
- `design/milestones.md`: "and Capxul (M7.07 to M7.11)" → "and the real vendors, the builder's staging token and contracts on a testnet (M7.07 to M7.09); Capxul (M7.10, M7.11) proves 1.0 (K42, K43)"

## What else it touches

- The briefs of Goals 3, 5, 6 and 8 to 15 each gain a "Winding down under K42" note under the title. Each lead sets
  `status: parked` when it stops (section 7). Goal 17's brief gains an app goal note and `release: beta`; Goal 16's
  gains "The superagent goes first"; Goal 19's brief, the lander, is new.
- The dated records K9, K28, K30, K32, K34, K38 and K39 gain "Superseded by K42" or "Superseded by K43" beside the
  changed words.
- `.agents/skills/conductor/`, `.agents/skills/github/` and `.agents/skills/threads/` each gain a K42 note at the top.
  Goal 18's slice 2 rewrites the first two whole.
- `docs/canon/status.md` gains a K42 note under its releases, and its Capxul section points at K43.
