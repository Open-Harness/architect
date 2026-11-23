# K41: a goal is a long-running agent, apps lead, and the framework goal always runs

**Decided 23 November 2026** with Aaron, by voice, in a Claude Code session: he heard it back as a draft (#694) and
said go. The live docs listed under "Supersedes" are rewritten in the same pull request, as `AGENTS.md`, "One way to
supersede", asks. Capxul's own shape is K42, decided in the same conversation.

## The problem

Read on 23 November 2026, from GitHub and the goal branches:

- **Too many goals for the agents running them.** There are 17 goals and 15 `goal/*` branches. Several are parked or
  never started (8, 10, 13, 14), but their branches and pull requests stay open. 22 pull requests are open.
- **Goals cut by area make every app need cross goals.** 33 Ask issues are open, most of them one goal asking another
  to land a slice early (K38). Goal 16's first Capxul feature waited on five pieces from four goals
  (`M7-capxul.md`, section 4, on #487). Goal 17 filed eight asks for K40's fixes (#531 to #538).
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

## The decision

### 1. Two kinds of goal

- **The framework goal (Goal 18)** always runs. It owns `main`, the engine and every package no app goal has claimed,
  the board, CI and the releases. It takes over the 🎼 conductor's loop: there is one manager, not two.
- **An app goal** builds one app end to end. Today there are two: **Capxul** (Goal 16, the north star, rewritten by
  K42) and **the superagent** (Goal 17, K39). Plugged In stays as the example app every change keeps green; it has no
  goal unless one is started.
- **A goal exists while its agent runs.** When it stops, it rewrites "Where it stands", releases its claims, and its
  open items go back to the board. No branch sits parked waiting for its lead.

### 2. How a piece of work moves

Every item on the board is at one stage:

1. **Provisional.** An app's first pass lists what it needs. Capxul's is K42's slice 4; the superagent's is K39 and
   K40.
2. **Spiked.** Each unknown has a spike's answer (`spikes/`, the `spike` skill). An unknown only Aaron can settle is a
   **grill**: a Decision issue labelled `needs-aaron`. His answer becomes a decision record, and the framework goal sends
   it to every running goal.
3. **Scaffoldable.** Its things, events, operations and journeys can be declared, and are, through the framework
   (`ortho add`, `ortho add journeys`, `ortho new adapter`), with the journeys red.
4. **Building.** Handlers until the journeys pass. Authors and builders keep their rules (`AGENTS.md`, the `author`
   skill).
5. **Built.** Green on `main`.
6. **Extracted.** Moved from the app's `plugins/` into `packages/` once it works. K39's call 7 now applies to every
   app.

### 3. The collision rule

An app goal owns every gap it finds, big or small. Before it starts one, it reads the board's claims:

1. **Another running goal has claimed it, or it is in a slice already scheduled.** Wait for that piece, or take the
   part of it that has landed.
2. **It would change paths another running goal has claimed.** Agree through the framework goal: one of them does it,
   or they split it.
3. **Neither.** Claim it and build it in its own slice, on its own branch, to the design its owner recorded if there
   is one.

Some merge cost is accepted. It stays small because each gap fix lands in `main` as soon as it is green, using K38's
early landing, which now goes into `main`. A **claim** is the `lane:<goal>` label on the item's issue plus a
"Touches" line naming the paths. The framework goal checks claims for overlaps every round. An Ask issue stays only for
case 2.

### 4. The framework goal's loop

Each round:

1. Read the board: every item not yet built, with its stage, its needs and its claims.
2. **What can run now:** items whose needs have landed and that are unclaimed, or claimed by the framework goal.
3. **What runs first**, in this order:
   1. an app goal is waiting on it now;
   2. it is on Capxul's next feature;
   3. it makes scaffolding better for every app (today: `ortho new` for an app, M2.09; `ortho add` for events,
      errors, roles and moves, M2.14 and M2.15; adapters from an ABI, #474);
   4. it keeps `main` green and CI fast;
   5. everything else on the 1.0 path.
4. Start workers from the top, as many as CI holds: 20 jobs at once on the free plan, and at most two ready pull
   requests per goal (CI-drafts).
5. Merge what is green and reviewed. Rebuild the board from the repository. Tell every running goal what landed and
   what was decided.

### 5. The board

- **One Project, "Orthograph".** Its truth is the capability map in `design/scope.md`, one row per item, giving its
  stage, the app that pulled it and its release. On every merge into `main`, the sync writes one issue per row and
  fills the Project from them. A goal changes a row in the same pull request that changes the item, so nobody has to
  remember to close an issue.
- **Fields:** Stage, Pulled by (Capxul, superagent or framework), Release, Lane (the claiming goal), and Kind
  (capability, gap, grill or snag).
- **Views:** the road to 1.0 (by release, then stage), by app, now (by lane), and grills (`needs-aaron`).
- **Milestones become the releases:** Preview, Beta and 1.0. Each goal's milestone closes when its goal stops.

### 6. The releases

The preview and the beta stay as K28 has them. **1.0 changes:** Capxul core runs on Orthograph, in Capxul's
staging. That means the books, HR and payroll in ERPNext's shapes, and the paid services (KYC and KYB, and bank
accounts through Bridge), as K42 sets out. The release slices (M7.01 to M7.04, M7.06 and M7.13) stay in 1.0. Plugged
In's stages 2 to 4 (wallets, the vault, the club on Aztec) leave 1.0's definition. Whatever Capxul pulls from them is
built when Capxul pulls it.

This is Aaron's call 7.

### 7. Winding down today's goals

Each goal not named in section 1 finishes the pull request it has in review, rewrites "Where it stands", sets
`status: parked`, and stops. Its open slices become board items at their stage. The framework goal's slice 2 sees each
one through.

| Goal | Lands first | Then |
|---|---|---|
| 3 · Stage 1 of Plugged In | #678, the npm preview's checks, and the M1.51 publish it leads to | `goal/stage-1` lands in `main` (Goal 18, slice 1) and is retired; `main` is the one integration branch |
| 4 · On chain | #677, the relayer, and #679, the follower (Capxul's first feature needs the follower) | parked |
| 5 · The UI layer | slice 3, the actions projection, in review | parked |
| 6 · The new portal | #584, the shell; #512, the map language; #562, the app projection | parked; #669 stays a draft for its board item |
| 7 · Safe, Hats and budgets | #294, landed or closed by Goal 18 | done |
| 8 · Workflows | #472, the workflow decision | parked |
| 9 · Time | #626, timers across processes | parked |
| 10 · Agents | #469, where an agent run lives | parked; #490 stays a draft |
| 11 · Events | nothing in review | parked; #498 stays a draft |
| 12 · Wallets | #499, its parked state | parked; #497 stays a draft |
| 13 · The vault | not started | its slices become board items |
| 14 · The club | #504, the Aztec spike, into `main` for the record | parked |
| 15 · Release | nothing in review | its slices become Goal 18's items; the granted credentials stay recorded in `M7-release.md`, on `goal/release` |
| 16 · Capxul | #487, its map, with K42's superseded marks | restarts under K42's brief |
| 17 · The superagent | keeps running, as an app goal | its base moves to `main` with Goal 18's slice 1 |

Goal 18 sorts each of the 33 open Ask issues: the asking app goal builds it (case 3), it stays open (case 2), or it
closes because it no longer applies.

## What was not chosen

- **A capability board worked by one or two standing framework goals**, proposed earlier in the same conversation.
  The board is kept. Planning framework work apart from the apps is dropped (Aaron's call 2).
- **Apps only, with no framework lane.** Nobody would own `main` and the shared engine (Aaron's call 4).
- **Merging the 17 goals into about four by area.** The asks between goals would stay.
- **Parking an app goal on any big gap.** Aaron: collision decides, not size (call 5).

## Open risks

- Two goals changing the engine at once will conflict, and the collision rule only catches what was claimed. Claims
  name paths, and fixes land in `main` small and early.
- The board needs the sync to read `scope.md` (Goal 18, slice 3). Until then the Project still shows goals.
- Retiring `goal/stage-1` leaves `main` as the only branch where its protections (CI jobs, `builder-paths`, resolved
  threads) apply. Goal 18 checks that `main` already requires each of them before it retires the branch.

## Supersedes

Applied on Aaron's go, in this pull request:

- `AGENTS.md`: "No slice starts until what it needs has landed, in any milestone order (K34), except on an integration
  branch, which builds what it needs there to its owner's design and is merged back by the conductor (Goal 17's, K39)"
  → "An app goal builds what it needs in its own slice, unless a running goal has claimed it or its paths (K41)"
- `AGENTS.md`: "coordinates only through the repository and GitHub: its brief's "Where it stands", its goal's milestone
  and `goal-<n>` label, and Snag and Ask issues in that milestone" → "coordinates through the repository and GitHub:
  its brief's "Where it stands", its claims on the board, and Snag issues (K41)"
- `design/goals/map.md`: "It owns paths, and only its own." → the page is rewritten as the running goals and K41's
  collision rule; the old map stays in git (`990d4a17`)
- `design/goals/08` to `15`, "How it runs": "A slice builds once what it needs has landed (K34" → "Under K41: a gap
  this goal finds goes by K41's collision rule"; "Anything outside "What it owns" is an Ask issue in the owning goal's
  milestone" → "Under K41, an Ask issue is only for two goals' claims that overlap"
- `design/goals/03`, `05`, `06` and `08` to `15`: each gains a "Winding down under K41" note under its title. Each
  lead sets `status: parked` when it stops (section 7)
- `design/goals/17-superagent.md`: "A framework fix made here is announced to its owner as an Ask issue in the owner's
  milestone" → "A framework fix made here is claimed on the board first"
- `AGENTS.md`: "merged into `goal/stage-1` by a merge commit" → "merged into `main` (into `goal/stage-1` until Goal 18
  retires it) by a merge commit"
- `.agents/skills/kanban/STATE.md`: "**1.0:** the beta, then stages 2 to 4 and the release slices." → "**1.0:** the
  beta, then Capxul core on Orthograph (K42) and the release slices (K41)."
- `design/scope.md`: "| **1.0** (stages 2 to 4) |" → "| **1.0** (Capxul core, K41) |"
- `design/milestones.md`: "**v1.0** is the beta plus stages 2 to 4 and the release" → "**v1.0** is the beta plus
  Capxul core (K42) and the release (K41)"
- `design/handoff.md`: "1.0 (stages 2 to 4)" → "1.0 (Capxul core, K41)"
- `design/decisions/K28-releases.md`, `K32-goals-coordinate-themselves.md`, `K34-goals-by-needs.md`: dated records.
  Each gains "Superseded by K41, 23 November 2026" beside its 1.0 row, its Ask rule, and its needs and independence
  rules. `K39-superagent.md` gains "Generalised by K41" beside its call 6.
- `.agents/skills/conductor/` and `.agents/skills/github/`: each gains a K41 note at its top now (the conductor is
  Goal 18; claims, the board's stages, milestones as releases). Goal 18's slice 3 rewrites both whole.
