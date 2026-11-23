<!-- Generated from the blueprint. Do not edit. -->
# thread

An issue, a pull request or a Slack thread a superagent listens to. One eval runs on it at a time.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| source | text |
| key | text |
| channel | schema |

## Machine

States: idle, queued, evaluating. A move from the wrong state is refused ThreadNotIdle (exit 84).

| move | from | to | emits |
|---|---|---|---|
| bind | (creates) | idle | ThreadSubscribed |
| closed | idle, queued, evaluating | idle | ThreadClosed |
| unsubscribe | idle, queued, evaluating | idle | ThreadUnsubscribed |
| queue | idle | queued | ThreadQueued |
| evaluate | queued | evaluating | ThreadEvaluating |
| release | evaluating | idle | ThreadReleased |

## Events

- `ThreadClosed`: carries thread (thread.id); emitted by the move closed
- `ThreadEvaluating`: carries thread (thread.id); emitted by the move evaluate
- `ThreadQueued`: carries thread (thread.id); emitted by the move queue
- `ThreadReleased`: carries thread (thread.id); emitted by the move release
- `ThreadSubscribed`: carries superagent (thread.superagent), thread (thread.id); emitted by the move bind
- `ThreadUnsubscribed`: carries superagent (thread.superagent), thread (thread.id); emitted by the move unsubscribe

## Operations

- [thread.bind](bind.md): Make the thread an event belongs to, once, for this superagent.
- [thread.closed](closed.md): Say a thread closed: a merged pull request, a closed issue.
- [thread.follow](follow.md): The executor follows a thread: its next messages go straight to it, with no eval.
- [thread.unrelated](unrelated.md): The executor says a thread has nothing to do with its ticket.
- [thread.unsubscribe](unsubscribe.md): Stop a ticket following a thread: a person's call, or the main agent's.
