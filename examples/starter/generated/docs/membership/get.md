<!-- Generated from the blueprint. Do not edit. -->
# membership.get

Read one membership by its id: organization, person, role.

**Who may call:** the holder of the membership, or the owner of its membership.organization.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | membership.id |

## Answer

| field | value |
|---|---|
| organization | membership.organization |
| person | membership.person |
| role | membership.role |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the holder of the membership, or the owner of its membership.organization; the handler never runs |

## Worked examples

### invite and accept

Starts from the world `founded`.

- **bob can't read olga's membership.** `bob` (signed in) calls and sends id the last call's membership, and is refused with NotAllowed, AR-001.
- **olga reads her membership: she is a member, not an owner.** `olga` (signed in) calls and sends id the last call's membership, and gets back the world's organization and gets back the cast's olga person and gets back `member`.

## How to call

```sh
starter membership get --id <id>
```

HTTP: `POST /membership/get` with the payload as JSON. SDK: `Sdk.membership.get(payload)`.
