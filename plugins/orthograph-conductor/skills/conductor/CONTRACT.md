# How the conductor and its workers work together

The conductor is the main agent: it owns the goal and the state. A worker is any other agent it starts for one job. They
work together under one contract, so every worker can be started the same way and every result read the same way.

## The brief: what the conductor gives a worker

Every worker starts from a brief with these six parts, in this order, and nothing else:

1. **Role**: one of the five below. Put the role's line into the brief, word for word, so the worker knows its limits.
2. **Skill**: the stage skill it follows (`ortho-spike`, `ortho-done` and so on).
3. **Task**: one sentence. One question for a spike, one thing or operation for an author, the brief `ortho brief
   <operation>` printed, for a builder.
4. **May touch**: the paths it may write. Everything else is read-only.
5. **Done when**: the checks that end the job, each a command where one exists.
6. **Hand back**: the shape below, and nothing else as its final answer.

The skills a worker follows: `ortho-spike` (spike), `ortho-done` (author), `ortho-build` (builder), `ortho-validate`
(reviewer). A designer worker follows `ortho-describe`.

### The roles

| role | touches | is given | is checked by |
|---|---|---|---|
| designer | the plan, the blueprint and the journey stubs | the problem, in the owner's words | the owner reads the blueprint, and every blank `ortho check` lists is a question the owner has seen |
| author | journeys and their starting worlds, and nothing else | the blueprint, and one operation or one finding | each journey step fails on empty handlers or is marked proved by the description, and each failure names what was expected |
| builder | the one handler its brief names | one brief, from `ortho brief` | `ortho prove` and `ortho check` pass, each run whole, with no flags |
| reviewer | nothing: it reads | the change and the brief it was made from | it wrote none of what it reviews |
| spike | throwaway code under `spikes/` | one question | one page with the answer and what was tried |

A builder working beside unbuilt siblings cannot pass a whole run alone: it hands back `partial`, and the whole run
is judged on the build's integration branch once every builder's work is in (`ortho-build`).

The author and the builder are never the same worker: a builder who writes its own stories writes down what its code
does, not what the owner meant. Nothing in Orthograph enforces this; the conductor keeps it by how it hands out the work.

## The hand-back: what a worker gives the conductor

```json
{ "worker": "w3", "role": "spike", "stage": "spike",
  "outcome": "done | blocked | partial",
  "did": ["what it did, one line each"],
  "evidence": [{ "cmd": "the command it ran", "printed": "what it printed, or the lines that matter" }],
  "touched": ["every path it wrote"],
  "open": ["a question it could not settle, for the owner"],
  "suggest": "what it would do next, in one sentence" }
```

`blocked` says what stopped it in `did` and what would unblock it in `suggest`. A worker never claims a check passed
without the command and what it printed in `evidence`. The conductor re-runs the evidence before it believes it.

## The events the conductor logs

One JSON object per event, through `conductor-state.mjs log`. `n` and `at` are added for you. Every event may carry `next`:
`{ "do": "...", "why": "..." }`.

| type | fields |
|---|---|
| `goal.set` | `goal`, `done_when` (list) |
| `stage.entered` | `stage`, `because` |
| `stage.reopened` | `stage`, `from` (the stage that found it), `because` |
| `stage.done` | `stage` |
| `check.ran` | `stage`, `check`, `cmd`, `printed`, `pass` |
| `open` | `stage`, `q`, `waits_on` (`owner` or a worker), `blocks` |
| `decision` | `stage`, `q`, `a`, `by` |
| `closed` | `q` (an open question that no longer matters) |
| `worker.started` | `stage`, `worker`, `role`, `task` |
| `worker.returned` | `stage`, `worker`, and the hand-back's `outcome`, `did`, `evidence`, `touched`, `open` |
| `blocker` | `stage`, `what` |
| `replan` | `stage`, `plan` (list), `clears` (list of blockers it gets round) |
| `note` | `text`, and `stage` if it is about one |

A loop is two events: `stage.reopened` on the earlier stage, then work, then `stage.done` again. Every visit stays in
the log and in the roadmap, so the person can see how the project got where it is.
