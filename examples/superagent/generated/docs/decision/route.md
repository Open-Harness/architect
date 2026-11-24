<!-- Generated from the blueprint. Do not edit. -->
# decision.route

Route an eval's items: one to twenty, each accept, attach, stop or ignore. An explicit request makes its ticket in every mode; in observe an inferred accept is only recorded as one it would make.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | decision.superagent |
| eval | decision.eval |
| items | decision.items |

## Answer

| field | value |
|---|---|
| decision | decision.id |

## Move

`route`: from nothing (it creates) to recorded, emitting DecisionRecorded.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent decision route --superagent <superagent> --eval <eval> --items <items>
```

HTTP: `POST /decision/route` with the payload as JSON. SDK: `Sdk.decision.route(payload)`.
