<!-- Generated from the blueprint. Do not edit. -->
# proposal.approve

Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval.

**Who may call:** anyone signed in by session.

## Payload

| field | value |
|---|---|
| proposal | proposal.id |

## Answer

(none)

## Move

`approve`: from waiting to approved, emitting ProposalApproved.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ProposalNotWaiting | 70 | PP-900 | the proposal is in a state approve can't start from; carries `state` |
| ProposalNotFound | 4 | PP-901 | nothing has the id in proposal; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in by session; the handler never runs |

## How to call

```sh
superagent proposal approve --proposal <proposal>
```

HTTP: `POST /proposal/approve` with the payload as JSON. SDK: `Sdk.proposal.approve(payload)`.
