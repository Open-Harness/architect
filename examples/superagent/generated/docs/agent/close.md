<!-- Generated from the blueprint. Do not edit. -->
# agent.close

Stop an agent's turn for one Assignment and say so: the seat that held it is then free.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| agent | agent.id |
| assignment | id |

## Answer

(none)

## Move

`close`: from idle or working to idle or stopped, emitting AgentClosed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AgentNotIdle | 50 | AG-900 | the agent is in a state close can't start from; carries `state` |
| AgentNotFound | 4 | AG-901 | nothing has the id in agent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent agent close --agent <agent> --assignment <assignment>
```

HTTP: `POST /agent/close` with the payload as JSON. SDK: `Sdk.agent.close(payload)`.
