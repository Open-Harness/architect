# F9: Foreman, version zero

Proposed 20 November 2026 as a draft for Aaron, and revised three times the same day after he read it (his answers relayed by
the conductor; his own phrases are quoted). Parked the same evening at his call ("let's drop it for now and just push on with
the framework"). **Landed 21 November 2026 as the design record**, under his standing authority relayed by the conductor:
"anything that's waiting on me, just go with the recommendations. You have authority." So both forks at the end are
settled at their recommendation, and recorded there. Nothing here is built, and building it stays parked until Aaron
raises it. The architecture is the building agent's to decide (`AGENTS.md`, "Who decides").

**The name is open.** Aaron keeps "Foreman" for now, because it fits the blueprint theme, and floated "who makes an
Orthograph?" as a way to find a better one. Nothing is renamed here. Read aloud, "Foreman" sounds like "Forman", the
framework's retired name, which is still in dated records (`design/naming.md:45`); the name search already noted that
"heard aloud it is 'foreman'" (`design/naming-search.md:139`).

Read first, and leaned on throughout: the working lessons (`design/process/lessons.md`), the model draft on draft PR 185
(`design/model/README.md` on branch `claude/orthograph-model-cf3dca`, "the model draft" below), the work system (F5)
and its board (K11), the logbook (D3), the agent harness (H1), the factory (K10), the portal (`design/portal.md`) and the
frame's skills (`design/frame/skills.md`). Words are the canon's (`docs/canon/outline.md`); **the person** means whoever
builds with Foreman (for Capxul and for Orthograph, Aaron).

## 1. What it is: a teammate

Foreman is an internal product lead, working with someone who doesn't know how to be a product lead. Not an outside
firm and not an assistant: in Aaron's words, "a teammate is a teammate". It owns ideas, iteration, ideation, code
spikes, and knowing where the project is. When a project starts, Foreman instantiates it; from then on it owns the code
and the pipeline, and knows where we are in it. It has impetus: "the thing's running, and it's coming back to prompt
you, or stopping when it's fully blocked."

**The goal: a person never touches the code and still knows it's correct.** Aaron will read code for a while; other
people shouldn't have to. They get that knowledge from the portal (section 7).

**It is for us first.** Foreman builds Orthograph itself and Capxul. The same routines run for any project.

**Where it is going.** An always-on, durable agent, like a Slack bot, that later runs on Pi Durable through the agent
harness (H1) as part of the product itself: the same framework, the same skills, the same tools. Version zero is a
Claude Code plugin with basic proactivity, and builds nothing heavy (section 6).

**What it is not.** Not the factory: the factory (K10) is the building agents and their sandboxes, which Foreman drives.
Not the agent kit: the kit (`design/frame/skills.md`, M3.12) is per-app skills for one job each; Foreman is the routines
that use them, and takes a kit skill's name wherever it does the same job, so the kit replaces its hand-written copy.

## 2. Why the blueprint

Driven by a person, a blueprint looks over-engineered. Driven by agents, the structure is what lets one person scale
their attention, the way Effect pays off once agents write the code. Everything that falls out of it is agent-native:
the SDK, React hooks on top of it, the server, staging, production, tests, evals and hill climbing, and monitoring.
Aaron: "a way to force a swarm of agents to not build slop: it might be verbose, but it's not slop." So Foreman never
skips the blueprint for real work. A spike may skip it, because a spike is thrown away (section 3).

## 3. How a project moves: a loop, not a line

Building doesn't go in a straight line. You go backwards and forwards: have an idea, spike something, get it working,
then maybe make a plugin, or maybe not; "everything doesn't have to be a plugin." Foreman doesn't need a new machine
for that. The board already carries it (section 5):

- **The milestones are the lanes.** The brief's "where it is" names the current one and what "done" means right now.
  Going back is ordinary: a task can be filed in an earlier milestone's lane at any time.
- **A task moves back as easily as forward.** Its stages today are backlog, decide, checks, build, review and done
  (`.agents/skills/kanban/SKILL.md:31`, on main), and a review that fails sends it back to build.
- **Ideas and spikes are tasks.** An idea is a task in the backlog. A spike is a task whose done-when is a question
  answered, and its throwaway code follows the `spike` skill.
- **A plugin is a task, not a stage.** At a piece's second real user, Foreman may propose cutting it out as a feature,
  as a task like any other; or not.

## 4. It knows the person

Foreman keeps the person's technical level and what they need to hear, and goes low-level or high-level for each
person. It learns that by asking, as the first part of intake on a new project, writes it into the brief as a short
section, "Working with you", and says out loud whenever it changes it. Today that knowledge is hand-written, for one
person:

```md
<!-- AGENTS.md:91, on main -->
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".
```

The intake questions, asked once and in this order before anything else: do you want to read the code, see the design,
or just hear what it does; will you mostly listen, look or read; and what do you never want to be surprised by. For
Aaron the answers are already on record: he listens, and reads code "for now". Every routine reads that section before
it speaks.

## 5. Its state: the brief and the board

Aaron, on the third draft's set of new things: "this is a bit too much. And it's just the thing that was already
planned. It's like a goal with milestones and tasks." Foreman's state is two things, both already half-built.

### The brief

What we are building, in depth: the document a new teammate reads to understand the product. Not a one-liner. One per
project; Foreman writes it from intake, and the person agrees it.

| Section | What it holds |
|---|---|
| **The idea** | a few paragraphs: the problem, who has it, and what changes for them |
| **The concept** | how the product works, in its own words: the core loop, the experience |
| **The high-level abstractions** | the handful of ideas the product is made of (for Capxul: company, authority, budget, payment, banking, agents as users), each in plain words, and the blueprint things it maps to once they exist |
| **Principles and non-goals** | what it will always do, and what it deliberately won't |
| **Where it is** | the current milestone and what "done" means right now, read from the board |
| **Decisions** | each agreed call: what, who, when and why, linking the task or thread it came from |
| **Open questions** | what isn't settled, each with who owns it |
| **Working with you** | the person's level and channel (section 4) |

**The agreed revision of the brief and the blueprint** is what Foreman builds within without asking (section 10). A
change to either is a new agreement. Capxul already has most of a brief, `capxul-next/docs/grounding.md`; Orthograph's
is the model draft. The format fits both. Where the brief lives is question 1.

### The board

The goal, its milestones and their tasks, each task with its history, its threads, its blockers, and the critical path.
The shape exists and is in use: the `kanban` skill's board, a claude.ai artifact with a shared database, snapshotted
into the repository. Its tasks today:

```md
<!-- .agents/skills/kanban/SKILL.md:29-33, on main -->
- **`tasks/<id>`.** The id is the slice with a dash (`M1-35`, `ST1-07`), or `X-…` for work outside the milestones.
  - Identity and copy: `ref` (`M1.35`), `lane` (`M1` … `M7`, `ST1` … `ST4`, `X`), `title`, `plain` (one plain line), `what`, `needs[]` (refs, `M1.11` form), `doneWhen`.
  - Where it stands: `stage` (`backlog`, `decide`, `checks`, `build`, `review` or `done`), `thread` (a `threads` id), `waiting` (`"aaron"` or null), `pr` (number or null), `updatedAt`.
  - `history[]`: `{stage, thread, at, note}`, appended, never rewritten.
  - `questions[]`: `{id, text, status: open|answered, owner, answer, raisedAt, answeredAt?, source}`.
```

What Aaron asked for, against what it has:

| Aaron asked | The board today | Change |
|---|---|---|
| goal, then milestones, then tasks | a lane per milestone; a task per slice | keep; add the goal explicitly |
| when the task was created, and by whom | the first `history` entry, when there is one | `createdAt` and `createdBy` on every task |
| who has touched the task | `history[]`: `{stage, thread, at, note}` | every change appends who made it: a person, Foreman or a thread |
| which thread is on it now | `thread`, one id | keep; plus every thread ever linked, in order |
| where that thread is | the thread's `sessionId`, `branch` and `pr` (`SKILL.md:34`) | a link that opens the session, and its live state: working, idle, waiting on you, or done |
| when to check back, and its progress | not held | each linked thread gets `lastCheckIn`, `progress` (one plain line) and `nextCheckIn` |
| blockers | `needs[]`, other slices only | explicit: a task is blocked by another task, a question or a person |
| the critical path | `meta/critical`, "curated by the conductor" (`SKILL.md:36`) | **derived** from blockers and milestone gates, never hand-written |
| links | `pr` | the task links its milestone, pull requests, journeys, grid cells and decisions |

**Ideas, spikes and questions are tasks, or notes on them** (the board already has `questions[]` on each task);
**decisions go in the brief**. Nothing else needs a thing of its own.

**Status is never stored.** Whether a task's check is green, whether its pull request merged and whether a journey
passes are read fresh from CI, `ortho prove` and the logbook. That carries over from the work system (F5 call 4). A
typed-in status drifts, as the board's ticks did (lesson 18).

**How Foreman uses it.**

- **Starting work:** it creates or picks the task, starts a thread, links it with the session link, and the task's
  history records who and when.
- **Checking in:** on a schedule or a hook (section 6), it reads each working thread, writes one check-in (progress and
  next check-in), and moves or unblocks tasks.
- **"Where are we":** the brief, then the current milestone, the critical path, what's blocked, and what waits on you.
  Every answer is read from the board and the tools, never from memory.
- **The portal** shows the brief and the board side by side, with "Needs you" on top (section 7).

### Where it lives, floor first

- **Now:** the kanban board as it is, with the fields above added. It works today and Aaron already uses it.
- **Next, when Capxul starts:** the same shape, declared as Orthograph things in Capxul's own blueprint, as ordinary app
  code, built once and used. The board's data moves over with one import. Capxul needs people signed in, which is the
  beta in the three releases (preview, beta and 1.0, `design/decisions/K28-releases.md:19`), so this step comes no earlier than that.
- **Later:** extracted as a feature when a second app (Orthograph's own project) needs it. The always-on loop is then a
  Durable Object calling those operations. K11's work board is the design that extraction meets.

Declared in Capxul, the task would look like this. The board's history becomes the task's events, so nobody keeps it by
hand:

```ts
// capxul/blueprint/things/task/thing.ts: proposed, Capxul's own code
import { Blueprint } from "orthograph";
import { Milestone } from "../milestone/thing.ts";

export const Task = Blueprint.thing({
  description: "One piece of work in a milestone, with one check that says it's done.",
  code: "TK",
  fields: {
    id: Blueprint.id("tsk"),
    milestone: Milestone.fields.id,
    title: Blueprint.text({ max: 140 }),
    doneWhen: Blueprint.text({ max: 500 }), // the one check, in words and as a command
    createdBy: Blueprint.id("per"),         // a person; Foreman and threads need a principal of their own (M2.01)
  },
});

// capxul/blueprint/things/task/events.ts: the history is the journal, never a hand-kept array
export const TaskFiled = Blueprint.event({ task: Task.fields.id, by: Blueprint.id("per") });
export const ThreadLinked = Blueprint.event({ task: Task.fields.id, thread: Blueprint.text({ max: 200 }) }); // the session link
export const CheckedIn = Blueprint.event({ task: Task.fields.id, progress: Blueprint.text({ max: 200 }) });
export const Blocked = Blueprint.event({ task: Task.fields.id, by: Blueprint.refAny() }); // a task, a question or a person
export const Unblocked = Blueprint.event({ task: Task.fields.id, by: Blueprint.refAny() });
```

Declaring it finds two gaps. **There is no time value yet**, so `createdAt`, `lastCheckIn` and `nextCheckIn` can't be
fields today, and the journal keeps order and the trace, not a clock time (time is now its own milestone, M8, designed
in `design/decisions/K23-time.md`, whose sketches already use time fields such as `startedAt` at lines 161-163; not
built):

```sql
-- packages/host-cloudflare/test/migrations-vault/0001_vault.sql:7-15, on goal/stage-1
CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
```

And **Foreman and its threads aren't principals yet**: a principal is anonymous or a person (F5, "Open, for the
language"), with agents planned for milestone 2 (M2.01, M2.03). Neither blocks the floor, which is the kanban artifact.

## 6. Proactivity: why a plugin, not a skill

A skill only runs when someone asks. A plugin adds hooks and schedules, which is how Foreman comes back to the person
without being asked. Version zero does the basic version now and builds nothing heavy:

| Waker | Version zero | What Foreman does |
|---|---|---|
| **Session start** | a `SessionStart` hook loads the `foreman` skill | the wake routine, then says where things stand |
| **A subagent or side session finishes** | the harness's own notice | records the fact, starts the next item |
| **The person speaks** | their message | answers, then drives: the next step, or one batched ask |
| **A scheduled check** | a scheduled task on the person's machine, set up with their yes on first run | the wake routine, read-only; anything that needs the person becomes an `attention` |
| **Stopping** | a `Stop` hook: is there work committed but not pushed? | pushes it (lesson 11) |

```jsonc
// plugins/foreman/hooks/hooks.json: proposed, not built
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "echo 'Run the foreman skill before anything else.'" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "jq -e '.stop_hook_active' >/dev/null && exit 0; test -z \"$(git log @{u}.. --oneline 2>/dev/null)\" || { echo 'Commits not pushed.' >&2; exit 2; }" }] }]
  }
}
```

The `Stop` hook lets the second stop through (`stop_hook_active` in the hook's input), so a push that fails can't
trap the session in a loop.

**The wake routine**, the same every time: read the brief, its "Working with you" first; read the board: the current
milestone, its tasks, their threads and blockers; gather the facts (`ortho check`, `ortho model --json`, `ortho impact`, the last prove
report, open pull requests and CI); record what changed; tell the person, at their height, in their channel; then drive.

**Later**, the durable agent wakes on events and alarms instead of hooks, as K11's manager does: it waits "on durable
deferreds and a daily clock" (M3.10), and finished runs come back through `runFinished` (M4.13).

**Harnesses: Claude first, Codex later, by migration.** The skills are `SKILL.md` folders that Codex already reads from
`.agents/skills/`; the hooks and the schedule are the part that has to be migrated.

## 7. The portal is central

People don't know what's happening because there is no portal; the portal is the fix. It is how a person who never
reads code still knows the app is correct, and it shows the brief and the board beside the app:

| The person wants to know | What shows it |
|---|---|
| Does it do what I said? | each journey as a story, green or red, from `ortho prove` |
| What can happen to an invitation? | the thing's machine, drawn; a journey walked across it, animated by the `machine-journey` skill (`.agents/skills/machine-journey/SKILL.md:3`, on main) |
| Who may do what? | roles and refusals on each operation's page |
| Did a change break anything? | the grid, and what `ortho impact` made stale |
| Where are we, and what do you need from me? | the brief and the board side by side, with "Needs you" on top |

Version zero is honest about the gap: the portal shows live calls only during a prove (the model draft, section 5), and
the board is the kanban artifact until Capxul declares it (section 5). Until then Foreman says it, and draws it when the
brief's "Working with you" says visual. When the portal does show the board, it is built on UI SDK, the interface base
that replaces HeroUI (K24, on pull request 217). UI SDK has no kanban board of its own, so the board is built on its
reorder behaviours (`createReorder`, `createTransfer`), as K24 notes.

## 8. Personality is routines

Aaron: personality means routines and workflows, and structuring and driving the conversation, the same way every
time. The routines follow where the board is (section 3), not a fixed order:

| Routine | Runs when | What it does |
|---|---|---|
| **Intake** | a new project, before anything else | the questions about the person (section 4), then the brief: the idea, the concept, the abstractions, principles and non-goals, what exists already; then the person agrees it |
| **Explore** | ideas in the backlog, or a fork that needs code to settle | turns ideas into tasks and spikes; each spike ends with what it found, and the decision goes in the brief |
| **Shape** | a milestone's tasks need declarations | declares; unknowns become `Blueprint.todo`, never guesses; reads journeys back as stories; asks the person to agree the blueprint |
| **Climb** | a task is ready to build | walks each journey with a throwaway handler before building it; one slice at a time unless nothing is shared (lesson 9); a 🔍 that wrote none of it; merges |
| **Watch** | the app is live | turns what the running app shows into ideas |
| **Extract** | a piece has its second real user, and the person says yes | cuts it out as a feature; or leaves it, because not everything has to be a plugin |
| **Where are we** | every wake | the four parts below, at the person's height |

**How it explains.** By the channel in "Working with you". For voice, the rules in "Talking to Aaron"
(`.agents/skills/threads/SKILL.md:55-76`): short sentences, answer first, no bare IDs. For visual, the house skills:
`machine-journey` for a lifecycle, `trace-waterfall` for one call in time, `visuals` for the rest, and the portal.

**The working rules**, in order, every turn:

1. Start by saying where we are, from the top down: where the brief says we are and what the board shows, what moved, what I need, what's next.
2. Drive. End every turn with the next step started, or one batched ask. Never "let me know what you'd like".
3. Plain words before labels; the canon's words; no slice numbers or decision IDs alone.
4. Check before you claim: anything said about the code or the app is read first-hand that turn (lesson 16).
5. Separate the judge from the judged: never write a handler and the journey that tests it in the same role (lesson 5).
6. Push before you report (lesson 11).
7. Decide inside what's agreed, record the call in the brief's Decisions, and say so. Ask only for what section 10 lists.

## 9. Its parts, as a plugin

```text
plugins/foreman/
  .claude-plugin/plugin.json      name, version, description
  skills/
    foreman/SKILL.md              the entry point: the working rules, the wake routine, which routine runs next
    intake/SKILL.md               the questions about the person, then the brief
    explore/SKILL.md              ideas, questions and spikes
    shape/SKILL.md                declarations, journeys read back, the blueprint agreed
    climb/SKILL.md                build, prove, review, merge
    watch/SKILL.md                the live app, turned into ideas
    extract/SKILL.md              a piece cut out as a feature, or left
    explain/SKILL.md              Orthograph and this app, at the person's height and in their channel
    author/SKILL.md               moved from .agents/skills, one copy
    reviewer/SKILL.md             moved from .agents/skills, one copy
  agents/
    journey-author.md             journeys from declarations, never handlers
    checks-author.md              makes journeys executable; the author skill's six proofs
    climber.md                    fills handlers until prove is green; never touches journeys
    framework-builder.md          fixes a gap in Orthograph, in Orthograph's repository, never in the app
    reviewer.md                   the 🔍: every door, one probe each; wrote none of what it reviews
  hooks/hooks.json                session start and stop (section 6)
```

The plugin is the harness side: the routines and the wakers. The brief and the board are the state side (section 5).

**One entry point.** Decided by Aaron: the conductor and Foreman are the same thing. On Orthograph's own repository
Foreman runs the same routines as on Capxul's. What the conductor skill holds today moves: starting and briefing
threads becomes Foreman's subagents and side sessions; `design/handoff.md` and the kanban board become the project's
state; the rules only about this repository (milestone gates, `-check` and `-build` branches, the ratchet file) stay in
`AGENTS.md`, which Foreman reads like any project's rules. `author` and `reviewer` move into the plugin, worded for any
project, and `.agents/skills/` links to them. The change that builds the plugin rewrites the conductor and kanban skills
and lists each replaced phrase under `## Supersedes`; until then they stay live, because they run the build today.

The split between journey author and climber is the one rule Foreman never bends. An app made by `ortho new` has no
`builder-paths` CI job, so in version zero the briefs and the 🔍 hold that line; a generated job belongs in the preset
(the Capxul test drive, finding 12).

## 10. Who decides: Foreman owns the project

Aaron: Foreman owns the project, the code and the pipeline. It needs permission for very few things. Inside the agreed
brief and blueprint "it can do what it wants. It can merge what it wants."

**It asks, and waits, for two things only:**

| Before | How it is held |
|---|---|
| **Moving to another stage**: the next milestone, back to an earlier one, or shipping | the brief's "where it is" changes only with the person's yes; Foreman proposes it as a question |
| **Changing the agreed brief or blueprint** | the person agrees a revision of each, recorded in the brief's Decisions: the brief's commit, and the model's revision, which the logbook already keeps (`design/decisions/D3.md:227-229`). A later change to the brief's principles and non-goals, or to what is declared (things, operations, roles, refusals), needs a new agreement. Telling that a change crossed the agreed revision is new work: `ortho impact` reports what a change made stale today, not what it changed against an agreement |

**Everything else is Foreman's:** handlers, the wording of journeys within the agreed stories, tests, spikes, the order
of work, which role does what, branches, and merging its own pull requests once CI is green and a 🔍 has passed. It
records each call that matters in the brief's Decisions and says so in the next "where are we".

**What still holds, because it isn't the project's to give:** the standing rules every agent here works under:
spending past the person's cap and anything in the cloud (`AGENTS.md:82`) and creating a credential (`AGENTS.md:86`).
The harness adds its own: it asks before sending a message to anyone on the person's behalf. These are guardrails
around every agent, not the project's permissions.

**How it asks:** batched, a recommendation first, as one short numbered list for the ear. A fork with code to compare
also goes in writing in the grill format, which the plugin holds its own copy of. Each answer goes in the brief's
Decisions.

## 11. Its tools

| Tool | What Foreman uses it for | Today (`packages/cli/src/main.ts` on `goal/stage-1`) |
|---|---|---|
| `ortho new` | instantiating a project | the Nx preset today; `ortho new` is M2.09 |
| `ortho model --json` | what is declared | built (`main.ts:24`) |
| `ortho add thing`, `operation`, `read`, `journey` | declaring | built (`main.ts:187`) |
| `ortho check` | blanks, types, rules, drift | built (`main.ts:195`) |
| `ortho generate` | outputs and scaffolds | built (`main.ts:207`) |
| `ortho prove`, `--empty`, `--only` | the climb, and proof the checks mean something | built (`main.ts:66`) |
| `ortho impact` | what a change made stale; comparing against the agreed revision is new work | built (`main.ts:219`), local only |
| `ortho brief <operation>` | a climber's brief for one operation; not the project's brief, which shares the word | built (`main.ts:268`) |
| `ortho dev` and the portal | running the app, its world and its portal | built (`main.ts:38`) |
| the kanban board, through the artifact's database | Foreman's board (section 5) | built; the new fields are not |
| the factory | builder agents | version zero: Claude Code subagents and sessions in their own worktrees; later `agents.run.start` (`K10-factory.md:209-216`) |
| `gh` | pull requests and CI | the person's own GitHub sign-in |

**When Orthograph falls short**, as Capxul's test drive shows it will (`design/foreman/test-drive-capxul.md`), the gap
is never patched in the app. It becomes a framework item with a journey that can't be walked, and the app keeps a
`Blueprint.todo` naming it until Orthograph closes it.

## 12. What this changes

- No live document's words change in this record, so there is no `## Supersedes` section; section 9 says which change
  will carry one.
- `design/handoff.md`'s decision list gains this record, F9, on `main`.
- Building it is a goal of its own, and it stays parked until Aaron raises Foreman again.

---

## The forks for Aaron

Aaron's answers have settled the rest, and those forks are dropped:

| What was asked | What was settled | Where |
|---|---|---|
| shared core | one thing | section 9 |
| state as files | no | |
| what wakes it | hooks and a schedule now | section 6 |
| who decides | Foreman owns the project | section 10 |
| learning the person | by asking, at intake | section 4 |
| the shape of its state | the brief and the board | section 5 |
| which store holds it, where it runs, where it first lives | answered by the floor: the kanban artifact now, Capxul's blueprint next | section 5 |

Two remained, asked against section 5's direction. Both are settled at their recommendation, as "The calls" at the end
records.

Shared terms for this round:

- **The brief:** what we are building, in depth, one per project (section 5).
- **The board:** the kanban skill's board, with the fields section 5 adds.
- **Agreed revision:** the version of the brief and the blueprint the person said yes to; Foreman builds within it
  without asking.
- **Floor:** the smallest version that does the real thing now.

## Q1 — Where does the brief live, and how is it agreed?

**The problem, in code.** The brief is what Foreman builds within, so it has to be versioned and agreed, and readable
by the person in their channel. Capxul's nearest thing today is a file in its repository:

```md
<!-- capxul-next/docs/grounding.md:13, at 50851875 (read only) -->
**Capxul is an on-chain company:** one complete business system with Capxul's money and authority built in.
```

Orthograph's is the model draft, also a file (`design/model/README.md` on draft PR 185). Neither has an "agreed"
mark, so nothing says which version Foreman may build within.

**What it touches**

| Dependent | Why it cares |
|---|---|
| section 10 | "the agreed revision of the brief and the blueprint" is the line Foreman builds within |
| the portal | shows the brief beside the board, or links out to it |
| intake and shape | write and revise it |
| Capxul's `grounding.md` and the model draft | become briefs, or stay beside one |

**The options**

**Today** — briefs exist as files with no agreement on them: `capxul-next/docs/grounding.md`, and
`design/model/README.md` on draft PR 185.

**A · A file in the repository, agreed by a commit** (recommended)
```bash
docs/brief.md                    # Capxul: grounding.md becomes it; Orthograph: design/brief.md
git log -1 --format=%h -- docs/brief.md   # the revision the person agreed is recorded in the brief's Decisions:
                                          # "20 Nov: brief agreed at 3f2a9c1, by Aaron"
```

**B · A thing in the app, shown in the portal**
```ts
// capxul/blueprint/things/brief/thing.ts: proposed
export const Brief = Blueprint.thing({
  description: "What we are building, in depth: one per project, agreed by the person.",
  code: "BR",
  fields: { id: Blueprint.id("brf"), idea: Blueprint.text({ max: 5000 }), concept: Blueprint.text({ max: 5000 }) /* … */ },
});
```

**C · A document in the kanban artifact's database**
```jsonc
// meta/brief, beside meta/critical
{ "idea": "…", "concept": "…", "abstractions": ["…"], "agreedAt": "2026-11-20T14:05:00Z" }
```

**You do X → what happens**

| Scenario | A · A file, agreed by a commit | B · A thing in the app | C · In the board's database |
|---|---|---|---|
| You listen to the brief on your phone | Foreman reads the file to you | the portal or Foreman reads it | Foreman reads it |
| Foreman wants to change a principle | a pull request you can read as a diff | an operation; the change is in the journal | an edit; versions only in the snapshot |
| A new teammate joins | reads one file in the repository | opens the portal | opens the board |
| The portal shows it | linked until the portal renders documents | built in | not in the portal |
| Capxul starts | `grounding.md` becomes the brief, today | waits for the app to run | copied in |

**Rubric**

| Axis | A · File | B · Thing | C · Board database |
|---|---|---|---|
| Floor-first | ✅ today | ❌ waits on Capxul running | ✅ today |
| Reversibility | ✅ a file | ⚠️ a declared thing | ✅ |
| Blast radius | ✅ one file per project | ⚠️ the app's model | ✅ |
| Correctness | ✅ every revision kept; the agreed one named | ✅ | ⚠️ versions only when snapshotted |
| Fit | ✅ how Capxul and the model draft already work | ⚠️ prose fields in a model | ⚠️ a long document in a board |

**Recommendation: A.** A brief is long prose that people read and argue over, and git already versions and diffs it;
the agreed revision is one line in its own Decisions. The portal can show it later, the way the canon's docs are shown.

## Q2 — Where does the board live first?

**The problem, in code.** The board works today, but it lives outside the repository, and its critical path is
written by hand:

```md
<!-- .agents/skills/kanban/SKILL.md:36, on main -->
- **`meta/critical`.** The critical path to Gate M2, curated by the conductor: `{goal, summary, steps[{title, note, tasks[{id, critical}]}], updatedAt}`. Re-curate it when a step lands or the path changes.
```

Declared as Orthograph things instead, it gets generated tools, a portal and a journal for its history, but it needs an
app that runs, and Capxul doesn't run on Orthograph yet.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the conductor and Aaron | use the board every day |
| the kanban skill and its snapshot | gain the new fields, or are retired |
| Capxul's blueprint | gains a goal, milestones and tasks, or not yet |
| the gate rule (`AGENTS.md:33-34`) | an Orthograph app in this repository would be milestone 3 work |

**The options**

**Today** — the board is a claude.ai artifact with a shared database, snapshotted into
`.agents/skills/kanban/data/` (`.agents/skills/kanban/SKILL.md:8-21`, on main).

**A · The kanban artifact now, with the new fields; declared in Capxul when Capxul starts** (recommended)
```text
this week   tasks gain createdAt, createdBy, threads[] with session link, live state, lastCheckIn, progress,
            nextCheckIn, blockedBy[], links; meta/critical is derived by a script from blockedBy and the gates
Capxul      the same shape as Capxul's own things; the board's data moves over with one import
later       extracted as a feature when Orthograph's own project app is the second user
```

**B · Declared as an Orthograph app straight away**
```bash
ortho add thing task --root examples/work   # Orthograph's project app now: its handlers are milestone 3 work,
                                            # so this needs a recorded exception to the gate rule
```

**You do X → what happens**

| Scenario | A · Artifact now, Capxul next | B · An app now |
|---|---|---|
| You ask where a thread is, next week | the task links the session and its last check-in | the same, once the app runs |
| Foreman checks in on threads overnight | writes check-ins to the artifact | writes them through the app's tools |
| The critical path changes | recomputed from blockers | derived by a read |
| Milestone order | untouched | an exception recorded |
| Capxul starts | the shape is proven by use; one import | already declared |

**Rubric**

| Axis | A · Artifact now, Capxul next | B · An app now |
|---|---|---|
| Floor-first | ✅ this week, on a board in use | ⚠️ weeks before it runs |
| Reversibility | ✅ fields added to documents | ⚠️ an app to retire if the shape is wrong |
| Blast radius | ✅ the kanban skill | ⚠️ the milestone plan |
| Correctness | ⚠️ history kept by hand until declared | ✅ history is the journal |
| Fit | ✅ build it once, use it, then extract | ⚠️ against the gate rule |

**Recommendation: A.** It answers "where is that thread, and when do I check on it?" this week, on the board Aaron
already uses, and Capxul's declaration then starts from a shape proved by use.

## At a glance

| # | Joint | Recommendation | Call, 21 November 2026 |
|---|---|---|---|
| 1 | Where the brief lives, and how it is agreed | A · a file in the repository, the agreed revision recorded in its Decisions | **A**, under Aaron's standing authority |
| 2 | Where the board lives first | A · the kanban artifact with the new fields now; declared in Capxul when Capxul starts | **A**, under Aaron's standing authority |

**The calls.** Aaron gave the conductor standing authority on 21 November 2026 to take the recommendation on anything
waiting on him, so both forks are settled at A. Question 1: a project's brief is a file in its repository, and the
revision the person agreed is one line in its Decisions. Question 2: the board stays the kanban artifact, gaining the
fields in section 5, and is declared in Capxul's blueprint when Capxul starts. Neither is built: Foreman stays parked.
