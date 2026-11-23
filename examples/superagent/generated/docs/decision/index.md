<!-- Generated from the blueprint. Do not edit. -->
# decision

What the main agent decided for an eval: each item accepted, attached, stopped or ignored.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| eval | id |
| items | schema |

## Machine

States: recorded, dismissed. A move from the wrong state is refused DecisionNotRecorded (exit 86).

| move | from | to | emits |
|---|---|---|---|
| route | (creates) | recorded | DecisionRecorded |
| dismiss | recorded | dismissed | DecisionDismissed |

## Events

- `DecisionDismissed`: carries decision (decision.id); emitted by the move dismiss
- `DecisionRecorded`: carries superagent (decision.superagent), decision (decision.id), eval (decision.eval); emitted by the move route

## Operations

- [decision.dismiss](dismiss.md): Set aside a decision a person disagrees with.
- [decision.route](route.md): Route an eval's items: one to twenty, each accept, attach, stop or ignore. In observe an accept is only recorded as one it would make.
