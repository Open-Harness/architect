<!-- Generated from the blueprint. Do not edit. -->
# superagent.create

Make a superagent, with its main agent, observing.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| name | superagent.name |
| purpose | superagent.purpose |
| connections | superagent.connections |
| playbook | superagent.playbook |
| slots | superagent.slots |
| main | superagent.main |

## Answer

| field | value |
|---|---|
| superagent | superagent.id |

## Move

`create`: from nothing (it creates) to observing, emitting SuperagentCreated.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SlotsOutOfRange | 61 | SU-001 | declared in errors.ts, carrying slots |
| AgentNotFound | 4 | AG-901 | nothing has the id in main; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent superagent create --name <name> --purpose <purpose> --connections <connections> --playbook <playbook> --slots <slots> --main <main>
```

HTTP: `POST /superagent/create` with the payload as JSON. SDK: `Sdk.superagent.create(payload)`.
