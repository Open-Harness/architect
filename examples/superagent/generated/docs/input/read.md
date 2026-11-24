<!-- Generated from the blueprint. Do not edit. -->
# input.read

Read one Input's text.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| input | input.id |

## Answer

| field | value |
|---|---|
| text | input.text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InputNotFound | 4 | IN-901 | nothing has the id in input; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input read --input <input>
```

HTTP: `POST /input/read` with the payload as JSON. SDK: `Sdk.input.read(payload)`.
