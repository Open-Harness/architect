<!-- Generated from the blueprint. Do not edit. -->
# eval

One judgement the main agent is asked for: a thread's waiting triggers, batched.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| thread | id |
| triggers | schema |
| activeAtStart | uint |
| timeoutMs | uint |
| deliveredAt (optional) | uint |

## Machine

States: queued, delivered, decided, unavailable. A move from the wrong state is refused EvalNotQueued (exit 85).

| move | from | to | emits |
|---|---|---|---|
| started | (creates) | queued | EvalStarted |
| delivered | queued | delivered | EvalDelivered |
| decided | delivered | decided | EvalDecided |
| expired | delivered | unavailable | EvalExpired |

## Invariants

- `eval.oneLiveEvalPerThread`: another queued or delivered eval holds this thread. Unique on thread, while queued or delivered; refuses nothing, a break is a defect.

## Events

- `EvalDecided`: carries eval (eval.id); emitted by the move decided
- `EvalDelivered`: carries superagent (eval.superagent), eval (eval.id); emitted by the move delivered
- `EvalExpired`: carries eval (eval.id); emitted by the move expired
- `EvalStarted`: carries superagent (eval.superagent), eval (eval.id), thread (eval.thread); emitted by the move started

## Operations

- [eval.context](context.md): Read what a judgement needs: the thread's history and what else it touches.
- [eval.decide](decide.md): Record one judgement per enabled rule.
- [eval.delivered](delivered.md): Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it.
- [eval.due](due.md): One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused.
- [eval.expire](expire.md): Give up on an eval that ran out of time: it is unavailable, and keeps its triggers until a person reevaluates one.
- [eval.read](read.md): Read one page of a thread, through its connection.
- [eval.start](start.md): Make an eval for one thread's waiting triggers.
