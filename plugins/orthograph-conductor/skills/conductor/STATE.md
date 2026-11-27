# The conductor's state: where it lives, its shape, and how to use it

The conductor remembers a project between turns and between sessions in three files, in the app's own repository:

```
.orthograph/conductor/
  log.jsonl    the truth: one event per line, append-only, never rewritten
  state.json   where the project is now, folded from the log (delete it and `rebuild` makes it again)
  ROADMAP.md     the same, for the owner to read (rebuilt every time an event is logged)
```

Commit all three. The log is the project's history: every question asked, every answer, every visit to every stage,
every worker and what it brought back. Only the conductor (the main agent) writes them, and only through the script. A
worker never touches them; it hands its result back and the conductor logs it.

## How to use it

```sh
S=<plugin>/scripts/conductor-state.mjs     # ${CLAUDE_PLUGIN_ROOT}/scripts/conductor-state.mjs in Claude Code
node $S init "sell tickets for small venues"     # once: sets the goal and enters plan
node $S brief                                    # where we are, in six lines (the hook runs brief --quiet)
node $S log '{"type":"open","stage":"plan","q":"is a refund final?"}'
node $S log '{"type":"decision","stage":"plan","q":"is a refund final?","a":"yes, after a day","next":{"do":"ask who may cancel","why":"the plan waits on it"}}'
node $S due                                      # for a scheduled wake: exit 0 if there is work without the owner, 3 if not
node $S show                                     # state.json
node $S rebuild                                  # state.json and ROADMAP.md again, from the log alone
```

Every command takes `--dir <app>` (the current folder by default). An event the state cannot take (an unknown type, a
stage that does not exist, bad JSON) is refused with exit 1 and nothing is written. `n` (its number) and `at` (the time)
are added to every event for you, and any `n` or `at` you pass is replaced. Each type's required fields (the
table below) are checked, and a `worker.returned` must name a worker that was started. Writes take a lock
(`.orthograph/conductor/lock`), so two writers at once (a scheduled wake and a live session) cannot both take the same
number.

## An event

What you log:

```json
{ "type": "stage.reopened",
  "stage": "plan", "from": "spike", "because": "a late reversal breaks a rule",
  "next": { "do": "ask the owner whether a settled payment is final", "why": "the spike found it can be reversed" } }
```

What the log keeps, with its number and time added:

```json
{ "n": 7, "at": "2026-11-26T10:04:00.000Z", "type": "stage.reopened",
  "stage": "plan", "from": "spike", "because": "a late reversal breaks a rule",
  "next": { "do": "ask the owner whether a settled payment is final", "why": "the spike found it can be reversed" } }
```

Every event may carry `next`, what the conductor will do next and why. The latest `next` is what the following turn starts
from, so put one on the last event of every turn.

| type | its fields | what it does to the state |
|---|---|---|
| `goal.set` | `goal`, `done_when` (list) | sets the goal and the project's own done checks |
| `stage.entered` | `stage`, `because` | starts a visit of that stage; it becomes the current stage |
| `stage.reopened` | `stage`, `from`, `because` | starts another visit of an earlier stage: a loop |
| `stage.done` | `stage` | ends the stage's current visit as done |
| `check.ran` | `stage`, `check`, `cmd`, `printed`, `pass` | records a check on the stage's current visit |
| `open` | `stage`, `q`, `waits_on` (`owner` or a worker id), `blocks` | adds an open question |
| `decision` | `stage`, `q`, `a`, `by` | records an answer and closes the question with the same `q` |
| `closed` | `q` | drops an open question that no longer matters |
| `worker.started` | `stage`, `worker`, `role`, `task` | adds a running worker to the stage's current visit |
| `worker.returned` | `stage`, `worker`, `outcome`, `did`, `evidence`, `touched`, `open` | ends the worker; its `open` questions join the list |
| `blocker` | `stage`, `what` | the stage is blocked |
| `replan` | `stage`, `plan` (list), `clears` (list of blockers' `what`) | the new plan; the blockers it names are cleared and the stage unblocked |
| `note` | `text`, and `stage` if it is about one | nothing; for the record |

The stages are `plan`, `spike`, `describe`, `done`, `build`, `review`, `trace`, `stage`, `watch`, `change` and
`agents`, in the order a project goes through them (`STAGES` in the script, each with its `done_when` checks).

## state.json

```json
{ "goal": "sell tickets for small venues",
  "done_when": ["the first operation is planned, described, has agreed journeys that fail on purpose, and is proved and reviewed"],
  "stage": "plan", "visit": 2,
  "roadmap": [
    { "stage": "plan", "title": "Plan it", "status": "doing", "done_when": [{ "check": "...", "reader": "owner" }],
      "visits": [
        { "visit": 1, "because": "first", "at": 2, "checks": [], "workers": [], "ended": { "outcome": "done", "at": 5 } },
        { "visit": 2, "because": "reopened from spike: a late reversal breaks a rule", "at": 7, "checks": [], "workers": [], "ended": null } ] },
    { "stage": "spike", "title": "Spike what you doubt", "status": "doing", "visits": ["..."] },
    { "stage": "describe", "title": "Describe it", "status": "todo", "visits": [] } ],
  "decided": [{ "q": "who sells?", "a": "organisers", "by": "owner", "at": 4 }],
  "open": [{ "q": "is a settled payment final?", "waits_on": "owner", "blocks": "plan", "at": 8 }],
  "workers": [{ "id": "w1", "role": "spike", "stage": "spike", "visit": 1, "task": "can a payment settle and then reverse?", "status": "done", "at": 6, "returned": 7 }],
  "blockers": [], "plan": [],
  "next": { "do": "ask the owner whether a settled payment is final", "why": "the spike found it can be reversed" },
  "last": 8 }
```

A stage's `status` is `todo`, `doing`, `done` or `blocked`. A loop never loses anything: each visit keeps why it
started, the checks it ran, the workers it started and how it ended.

## Tests

`scripts/conductor-state.test.ts`, run with `bun test` from the plugin's folder. They cover every event type, loops,
refusals, the lock, rebuilding from the log alone, the brief, and the command line.
