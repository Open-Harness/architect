<!-- Generated from the blueprint. Do not edit. -->
# outgoing-message

One reply to a person, kept until it is sent: in order, the head of its conversation first.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| ticket | ticket.id |
| conversation | text |
| purpose | text |
| text | text |
| failures | uint |
| notBefore | uint |

## Machine

States: pending, sent, dropped. A move from the wrong state is refused OutgoingMessageNotPending (exit 101).

| move | from | to | emits |
|---|---|---|---|
| queued | (creates) | pending | ReplyQueued |
| requeued | pending | pending | ReplyQueued |
| settled | pending | pending, sent, dropped | ReplySettled |
| withdrawn | pending | dropped | ReplyWithdrawn |

## Events

- `ReplyQueued`: carries superagent (outgoing-message.superagent), ticket (outgoing-message.ticket), message (outgoing-message.id); emitted by the move queued, requeued
- `ReplySettled`: carries superagent (outgoing-message.superagent), message (outgoing-message.id); emitted by the move settled
- `ReplyWithdrawn`: carries superagent (outgoing-message.superagent), message (outgoing-message.id); emitted by the move withdrawn

## Operations

- [outgoing-message.reply](reply.md): Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row.
- [outgoing-message.retry](retry.md): Queue a failed reply again, once its wait has passed.
- [outgoing-message.send](send.md): Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success.
- [outgoing-message.withdraw](withdraw.md): Drop a ticket's pending replies: it ended, or its superagent retired.
