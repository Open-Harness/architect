<!-- Generated from the blueprint. Do not edit. -->
# run

One agent working one task: which agent type, on which model, with what budget.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| mission | mission.id |
| task | TaskKey |
| agent | AgentType |
| model | ModelName |
| budget | Cents |

## Machine

States: running, waiting, finished, failed, stopped. A move from the wrong state is refused RunNotRunning (exit 60).

| move | from | to | emits |
|---|---|---|---|
| start | (creates) | running | RunStarted |
| report | running, waiting | running, waiting | RunReported |
| finish | running | finished | RunFinished |
| fail | running, waiting | failed | RunFailed |
| stop | running, waiting | stopped | RunStopped |

## Events

- `RunFailed`: carries run (run.id), why (Note); emitted by the move fail
- `RunFinished`: carries run (run.id), branch (Branch); emitted by the move finish
- `RunReported`: carries run (run.id), report (Report), note (Note); emitted by the move report
- `RunStarted`: carries run (run.id), mission (run.mission), task (run.task), agent (run.agent), model (run.model); emitted by the move start
- `RunStopped`: carries run (run.id), why (Note); emitted by the move stop

## Operations

- [run.fail](fail.md): The run gave up, saying why.
- [run.finish](finish.md): The run pushed its branch. CI proves it; the run cannot close its own task.
- [run.list](list.md): List runs, newest first, 50 to a page, filtered by mission, task, state.
- [run.report](report.md): Say how the run is going. It moves no card.
- [run.start](start.md): Start an agent on one task. The run claims the task until it ends.
- [run.stop](stop.md): Stop the run. A person's act, or the mission stopping.
