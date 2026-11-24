<!-- Generated from the blueprint. Do not edit. -->
# proposal.propose

Record what a main agent would change, and why: nothing changes until a person approves it.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | proposal.superagent |
| operation | proposal.operation |
| changes | proposal.changes |
| why | proposal.why |

## Answer

| field | value |
|---|---|
| proposal | proposal.id |

## Move

`propose`: from nothing (it creates) to waiting, emitting ProposalRecorded.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent proposal propose --superagent <superagent> --operation <operation> --changes <changes> --why <why>
```

HTTP: `POST /proposal/propose` with the payload as JSON. SDK: `Sdk.proposal.propose(payload)`.
