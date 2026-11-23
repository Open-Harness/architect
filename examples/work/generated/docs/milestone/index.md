<!-- Generated from the blueprint. Do not edit. -->
# milestone

A stage of a mission: which steps of the build loop, over which thing or operation, and how far.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| mission | mission.id |
| title | Title |
| kinds | TaskKinds |
| of | Subject |
| until | Environment |

## Machine

States: active, dropped. A move from the wrong state is refused MilestoneNotActive (exit 52).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | active | MilestoneAdded |
| drop | active | dropped | MilestoneDropped |

## Events

- `MilestoneAdded`: carries milestone (milestone.id), mission (milestone.mission), kinds (milestone.kinds), of (milestone.of), until (milestone.until); emitted by the move add
- `MilestoneDropped`: carries milestone (milestone.id); emitted by the move drop

## Operations

- [milestone.add](add.md): Add a milestone to a mission. Its tasks appear at once: its kinds over its subject.
- [milestone.drop](drop.md): Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step.
- [milestone.list](list.md): List milestones, oldest first, 50 to a page, filtered by mission, state.
