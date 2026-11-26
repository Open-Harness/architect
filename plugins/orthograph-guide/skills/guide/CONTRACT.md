# How the guide and its threads work together

The guide is the main agent: it owns the goal and the state. A thread is any other agent it starts for one job. They
work together under one contract, so every thread can be started the same way and every result read the same way.

## The brief: what the guide gives a thread

Every thread starts from a brief with these six parts, in this order, and nothing else:

1. **Role**: designer, author, builder, reviewer or spike. The role's limits are the kit's (`docs/manual/kit/roles.json`
   in the Orthograph repository): what it may touch, what it is given, how it is checked.
2. **Skill**: the stage skill it follows (`guide-spike`, `guide-done` and so on).
3. **Task**: one sentence. One question for a spike, one thing or operation for an author, one brief from `ortho brief`
   for a builder.
4. **May touch**: the paths it may write. Everything else is read-only.
5. **Done when**: the checks that end the job, each a command where one exists.
6. **Hand back**: the shape below, and nothing else as its final answer.

## The hand-back: what a thread gives the guide

```json
{ "thread": "t3", "role": "spike", "stage": "spike",
  "outcome": "done | blocked | partial",
  "did": ["what it did, one line each"],
  "evidence": [{ "cmd": "the command it ran", "printed": "what it printed, or the lines that matter" }],
  "touched": ["every path it wrote"],
  "open": ["a question it could not settle, for the owner"],
  "suggest": "what it would do next, in one sentence" }
```

`blocked` says what stopped it in `did` and what would unblock it in `suggest`. A thread never claims a check passed
without the command and what it printed in `evidence`. The guide re-runs the evidence before it believes it.

## The events the guide logs

One JSON object per event, through `guide-state.mjs log`. `n` and `at` are added for you. Every event may carry `next`:
`{ "do": "...", "why": "..." }`.

| type | fields |
|---|---|
| `goal.set` | `goal`, `done_when` (list) |
| `stage.entered` | `stage`, `because` |
| `stage.reopened` | `stage`, `from` (the stage that found it), `because` |
| `stage.done` | `stage` |
| `check.ran` | `stage`, `check`, `cmd`, `printed`, `pass` |
| `open` | `stage`, `q`, `waits_on` (`owner` or a thread), `blocks` |
| `decision` | `stage`, `q`, `a`, `by` |
| `closed` | `q` (an open question that no longer matters) |
| `thread.started` | `stage`, `thread`, `role`, `task` |
| `thread.returned` | `stage`, `thread`, and the hand-back's `outcome`, `did`, `evidence`, `touched`, `open` |
| `blocker` | `stage`, `what` |
| `replan` | `stage`, `plan` (list), `clears` (list of blockers it gets round) |
| `note` | `stage`, `text` |

A loop is two events: `stage.reopened` on the earlier stage, then work, then `stage.done` again. Every visit stays in
the log and in the roadmap, so the person can see how the project got where it is.
