<!-- Generated from the blueprint. Do not edit. -->
# system.health

Is the application up?

**Who may call:** anyone.

**Budget:** p95 50ms.

## Payload

(none)

## Answer

| field | value |
|---|---|
| status | Ok |

## Refusals

(none)

## Worked examples

### health is up

Starts from an empty world.

- **anyone can ask if the application is up.** `visitor` (anyone) calls and sends nothing, and gets back `ok`.

## How to call

```sh
starter system health
```

HTTP: `POST /system/health` with the payload as JSON. SDK: `Sdk.system.health(payload)`.
