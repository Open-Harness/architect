<!-- Generated from the blueprint. Do not edit. -->
# organization

A company whose owner hands out allowances, up to a cap each.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | text |
| owner | person.id |
| cap | Amount |

## Machine

States: active. A move from the wrong state is refused OrganizationNotActive (exit 20).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | OrganizationCreated |

## Events

- `OrganizationCreated`: carries organization (organization.id), owner (organization.owner); emitted by the move create

## Roles

- owner

## Operations

- [organization.create](create.md): Found an organisation with its cap. Whoever founds it owns it, and is its first member.
- [organization.get](get.md): Read one organization by its id: name, owner, state.
