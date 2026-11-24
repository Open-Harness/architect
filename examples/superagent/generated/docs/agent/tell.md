<!-- Generated from the blueprint. Do not edit. -->
# agent.tell

Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| agent | agent.id |
| requestId | text |
| input | text |
| assignment (optional) | id |
| opens | schema |

## Answer

(none)

## Move

`tell`: from idle or working to working, emitting AgentTold.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StaleAssignment | 51 | AG-001 | declared in errors.ts, carrying assignment |
| AgentNotIdle | 50 | AG-900 | the agent is in a state tell can't start from; carries `state` |
| AgentNotFound | 4 | AG-901 | nothing has the id in agent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent agent tell --agent <agent> --requestId <requestId> --input <input> [--assignment <assignment>] --opens <opens>
```

HTTP: `POST /agent/tell` with the payload as JSON. SDK: `Sdk.agent.tell(payload)`.
