<!-- Generated from the blueprint. Do not edit. -->
# superagent

One always-on agent, stored as data.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | text |
| purpose | text |
| connections | schema |
| playbook | schema |
| slots | uint |
| main | agent.id |
| pausedFrom (optional) | schema |
| pausedAt (optional) | uint |
| pausedFor | uint |
| passGen | uint |
| revision | uint |
| saved (optional) | schema |

## Machine

States: observing, live, paused, retired. A move from the wrong state is refused SuperagentNotObserving (exit 60).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | observing | SuperagentCreated |
| goLive | observing | live | SuperagentWentLive |
| pause | observing, live | paused | SuperagentPaused |
| resume | paused | observing, live | SuperagentResumed |
| retire | observing, live, paused | retired | SuperagentRetired |

## Invariants

- `superagent.oneVersionPerRevision`: another superagent holds this revision. Unique on revision, in every state; refuses nothing, a break is a defect.

## Events

- `SuperagentCreated`: carries superagent (superagent.id); emitted by the move create
- `SuperagentPaused`: carries superagent (superagent.id), from (text), at (uint); emitted by the move pause
- `SuperagentResumed`: carries superagent (superagent.id), to (text), at (uint), length (uint); emitted by the move resume
- `SuperagentRetired`: carries superagent (superagent.id); emitted by the move retire
- `SuperagentWentLive`: carries superagent (superagent.id); emitted by the move goLive

## Roles

- itsMain

## Operations

- [superagent.boot](boot.md): The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost.
- [superagent.create](create.md): Make a superagent, with its main agent, observing.
- [superagent.fill](fill.md): Start waiting Assignments, in line, while seats are free. Does nothing while paused.
- [superagent.go-live](go-live.md): Let a superagent act: a person, after reading what it would have accepted.
- [superagent.health](health.md): Read one superagent by its id: name, state, pausedAt.
- [superagent.pause](pause.md): Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session.
- [superagent.reap](reap.md): Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed.
- [superagent.resume](resume.md): Let held work go, and move every eval's deadline later by the pause's length. Only a person, through a session.
- [superagent.retire](retire.md): Close a superagent's connections and agents.
- [superagent.update](update.md): Save a superagent's configuration as a new version; a stale save is refused.
