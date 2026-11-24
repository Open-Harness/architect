<!-- Generated from the blueprint. Do not edit. -->
# agent.open

Make an agent of one kind, about one thing: any operation allowed to create one makes it.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| kind | agent.kind |
| about | agent.about |

## Answer

| field | value |
|---|---|
| agent | agent.id |

## Move

`open`: from nothing (it creates) to idle, emitting AgentOpened.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent agent open --kind <kind> --about <about>
```

HTTP: `POST /agent/open` with the payload as JSON. SDK: `Sdk.agent.open(payload)`.
