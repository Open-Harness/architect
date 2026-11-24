<!-- Generated from the blueprint. Do not edit. -->
# ticket.policy-changed

Tell the live tickets the policy changed under them.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| revision | uint |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent ticket policy-changed --superagent <superagent> --revision <revision>
```

HTTP: `POST /ticket/policy-changed` with the payload as JSON. SDK: `Sdk.ticket.policy-changed(payload)`.
