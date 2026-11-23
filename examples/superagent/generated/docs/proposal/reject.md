<!-- Generated from the blueprint. Do not edit. -->
# proposal.reject

Turn a proposal down.

**Who may call:** anyone signed in by session.

## Payload

| field | value |
|---|---|
| proposal | proposal.id |

## Answer

(none)

## Move

`reject`: from waiting to rejected, emitting ProposalRejected.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ProposalNotWaiting | 70 | PP-900 | the proposal is in a state reject can't start from; carries `state` |
| ProposalNotFound | 4 | PP-901 | nothing has the id in proposal; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in by session; the handler never runs |

## How to call

```sh
superagent proposal reject --proposal <proposal>
```

HTTP: `POST /proposal/reject` with the payload as JSON. SDK: `Sdk.proposal.reject(payload)`.
