<!-- Generated from the blueprint. Do not edit. -->
# superagent.update

Save a superagent's configuration as a new version; a stale save is refused.

**Who may call:** anyone signed in, or the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |
| base | uint |
| name | superagent.name |
| purpose | superagent.purpose |
| connections | superagent.connections |
| playbook | superagent.playbook |
| slots | superagent.slots |

## Answer

| field | value |
|---|---|
| revision | uint |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SlotsOutOfRange | 61 | SU-001 | declared in errors.ts, carrying slots |
| StaleRevision | 62 | SU-002 | declared in errors.ts, carrying current |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent superagent update --superagent <superagent> --base <base> --name <name> --purpose <purpose> --connections <connections> --playbook <playbook> --slots <slots>
```

HTTP: `POST /superagent/update` with the payload as JSON. SDK: `Sdk.superagent.update(payload)`.
