<!-- Generated from the blueprint. Do not edit. -->
# mandate.revalidate

Check a ticket's mandate against the policy as it is now, before the ticket resumes.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| ticket | mandate.ticket |

## Answer

| field | value |
|---|---|
| mandate | mandate.id |

## Move

`revalidate`: from withdrawn or held to held or revoked, emitting MandateRevalidated.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MandateNotHeld | 91 | MA-900 | the mandate is in a state revalidate can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent mandate revalidate --ticket <ticket>
```

HTTP: `POST /mandate/revalidate` with the payload as JSON. SDK: `Sdk.mandate.revalidate(payload)`.
