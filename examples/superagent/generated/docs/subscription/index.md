<!-- Generated from the blueprint. Do not edit. -->
# subscription

A ticket following one thread: its own, one attached, one for context, or one it is bound to.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| ticket | ticket.id |
| thread | text |
| mode | schema |

## Machine

States: live, ended. A move from the wrong state is refused SubscriptionNotLive (exit 92).

| move | from | to | emits |
|---|---|---|---|
| follow | (creates) | live | SubscriptionStarted |
| unfollow | live | ended | SubscriptionEnded |

## Invariants

- `subscription.oneFollowPerThread`: another live subscription holds this ticket and thread. Unique on ticket, thread, while live; refused AlreadyFollowing.

## Events

- `SubscriptionEnded`: carries subscription (subscription.id); emitted by the move unfollow
- `SubscriptionStarted`: carries subscription (subscription.id), ticket (subscription.ticket); emitted by the move follow

## Operations

(none yet)
