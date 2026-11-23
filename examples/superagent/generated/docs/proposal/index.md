<!-- Generated from the blueprint. Do not edit. -->
# proposal

What a main agent would change in a superagent's configuration, and why, waiting for a person.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| operation | text |
| changes | schema |
| why | text |

## Machine

States: waiting, approved, rejected. A move from the wrong state is refused ProposalNotWaiting (exit 70).

| move | from | to | emits |
|---|---|---|---|
| propose | (creates) | waiting | ProposalRecorded |
| approve | waiting | approved | ProposalApproved |
| reject | waiting | rejected | ProposalRejected |

## Events

- `ProposalApproved`: carries proposal (proposal.id); emitted by the move approve
- `ProposalRecorded`: carries proposal (proposal.id), superagent (proposal.superagent); emitted by the move propose
- `ProposalRejected`: carries proposal (proposal.id); emitted by the move reject

## Operations

- [proposal.approve](approve.md): Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval.
- [proposal.propose](propose.md): Record what a main agent would change, and why: nothing changes until a person approves it.
- [proposal.reject](reject.md): Turn a proposal down.
- [proposal.waiting](waiting.md): List proposals, oldest first, 25 to a page, filtered by superagent.
