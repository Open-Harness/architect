<!-- Generated from the blueprint. Do not edit. -->
# superagent.boot

The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost.

**Who may call:** the system.

## Payload

(none)

## Answer

| field | value |
|---|---|
| armed | uint |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent superagent boot
```

HTTP: `POST /superagent/boot` with the payload as JSON. SDK: `Sdk.superagent.boot(payload)`.
