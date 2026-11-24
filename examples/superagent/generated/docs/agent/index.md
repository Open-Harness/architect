<!-- Generated from the blueprint. Do not edit. -->
# agent

One agent: a durable conversation that lives in its own actor, told through the outbox and acting as itself.

Lives in its own Durable Object.

## Fields

| field | value |
|---|---|
| id | id |
| kind | text |
| about | text |
| current (optional) | schema |
| closed (optional) | schema |
| told (optional) | schema |

## Machine

States: idle, working, stopped. A move from the wrong state is refused AgentNotIdle (exit 50).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | idle | AgentOpened |
| tell | idle, working | working | AgentTold |
| idled | working | idle | AgentIdled |
| close | idle, working | idle, stopped | AgentClosed |

## Events

- `AgentClosed`: carries agent (agent.id), assignment (id); emitted by the move close
- `AgentIdled`: carries agent (agent.id), about (agent.about), assignment (id); emitted by the move idled
- `AgentOpened`: carries agent (agent.id), kind (agent.kind), about (agent.about); emitted by the move open
- `AgentTold`: carries agent (agent.id), requestId (text); emitted by the move tell

## Operations

- [agent.close](close.md): Stop an agent's turn for one Assignment and say so: the seat that held it is then free.
- [agent.open](open.md): Make an agent of one kind, about one thing: any operation allowed to create one makes it.
- [agent.tell](tell.md): Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id.
